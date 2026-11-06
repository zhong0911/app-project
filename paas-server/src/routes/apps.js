import express from 'express'
import { config } from '../config.js'
import { db, logEvent, now, serializeApp, serializeDeployment } from '../db.js'
import { allocatePort, createDeployment, createRollbackDeployment, getDeploymentLogs, getDeploymentRow, subscribeDeployment } from '../deploy.js'
import { getExecutor, getExecutorInfo } from '../executor/index.js'
import { BusinessError, asyncHandler, ok } from '../http.js'
import { requireAuth } from '../auth.js'

const router = express.Router()
router.use('/paas', requireAuth)

function slugify(input) {
  const text = String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return text || `app-${Math.random().toString(36).slice(2, 8)}`
}

function uniqueSlug(base, ignoreId = null) {
  let slug = base
  let i = 1
  while (true) {
    const row = db.prepare('SELECT id FROM apps WHERE slug = ?').get(slug)
    if (!row || row.id === ignoreId) return slug
    i += 1
    slug = `${base}-${i}`
  }
}

function normalizeAppPayload(body, existing = null) {
  const name = String(body.name ?? existing?.name ?? '').trim()
  if (!name) throw new BusinessError('应用名称不能为空')
  if (name.length > 40) throw new BusinessError('应用名称不能超过 40 个字符')

  const sourceType = body.sourceType ?? existing?.source_type ?? 'git'
  if (!['git', 'image'].includes(sourceType)) throw new BusinessError('不支持的应用来源类型')

  const repoUrl = String(body.repoUrl ?? existing?.repo_url ?? '').trim()
  if (sourceType === 'git' && !repoUrl) throw new BusinessError('请填写 Git 仓库地址')
  if (sourceType === 'git' && !/^(https?:\/\/|git@)/.test(repoUrl)) {
    throw new BusinessError('Git 仓库地址需以 http(s):// 或 git@ 开头')
  }
  const image = String(body.image ?? existing?.image ?? '').trim()
  if (sourceType === 'image' && !image) throw new BusinessError('请填写镜像地址')

  const port = Number(body.port ?? existing?.port ?? 80)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new BusinessError('容器端口需为 1-65535 的整数')

  const cpu = Number(body.cpu ?? existing?.cpu ?? 0.5)
  if (!(cpu > 0 && cpu <= 32)) throw new BusinessError('CPU 限制需在 0-32 核之间')

  const memoryMb = Number(body.memoryMb ?? existing?.memory_mb ?? 512)
  if (!Number.isInteger(memoryMb) || memoryMb < 64 || memoryMb > 32768) {
    throw new BusinessError('内存限制需为 64-32768 MB 的整数')
  }

  const env = body.env && typeof body.env === 'object' && !Array.isArray(body.env) ? body.env : {}
  for (const [key, value] of Object.entries(env)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new BusinessError(`环境变量名不合法：${key}`)
    if (String(value).length > 2000) throw new BusinessError(`环境变量 ${key} 过长`)
  }

  return {
    name,
    sourceType,
    repoUrl,
    branch: String(body.branch ?? existing?.branch ?? 'main').trim() || 'main',
    dockerfile: String(body.dockerfile ?? existing?.dockerfile ?? 'Dockerfile').trim() || 'Dockerfile',
    image,
    port,
    cpu,
    memoryMb,
    replicas: Math.max(1, Math.min(10, Number(body.replicas ?? existing?.replicas ?? 1))),
    env,
    autoDeploy: body.autoDeploy ?? existing?.auto_deploy ?? 0,
  }
}

function lastDeploymentFor(appId) {
  const row = db.prepare('SELECT * FROM deployments WHERE app_id = ? ORDER BY id DESC LIMIT 1').get(appId)
  return row ? serializeDeployment(row) : null
}

router.get(
  '/paas/apps',
  asyncHandler(async (req, res) => {
    const keyword = String(req.query.keyword || '').trim().toLowerCase()
    const status = String(req.query.status || '').trim()
    let rows = db.prepare('SELECT * FROM apps ORDER BY id DESC').all()
    if (keyword) {
      rows = rows.filter(
        (row) => row.name.toLowerCase().includes(keyword) || row.slug.toLowerCase().includes(keyword),
      )
    }
    if (status) rows = rows.filter((row) => row.status === status)
    const apps = rows.map((row) => ({
      ...serializeApp(row),
      url: row.host_port ? (config.publicHost ? `${config.publicHost}/${row.slug}` : `http://localhost:${row.host_port}`) : '',
      lastDeployment: lastDeploymentFor(row.id),
    }))
    return ok(res, { items: apps, total: apps.length })
  }),
)

router.post(
  '/paas/apps',
  asyncHandler(async (req, res) => {
    const payload = normalizeAppPayload(req.body || {})
    const slug = uniqueSlug(slugify(req.body?.slug || payload.name))
    const info = db
      .prepare(
        `INSERT INTO apps (name, slug, source_type, repo_url, branch, dockerfile, image, port, cpu, memory_mb, replicas, env_json, status, auto_deploy, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?, ?)`,
      )
      .run(
        payload.name,
        slug,
        payload.sourceType,
        payload.repoUrl,
        payload.branch,
        payload.dockerfile,
        payload.image,
        payload.port,
        payload.cpu,
        payload.memoryMb,
        payload.replicas,
        JSON.stringify(payload.env),
        payload.autoDeploy ? 1 : 0,
        now(),
        now(),
      )
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(Number(info.lastInsertRowid))
    logEvent(app.id, 'info', `创建应用 ${app.name}`)
    return ok(res, serializeApp(app), '应用已创建')
  }),
)

router.get(
  '/paas/apps/:id',
  asyncHandler(async (req, res) => {
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(Number(req.params.id))
    if (!app) throw new BusinessError('应用不存在', 404)
    const deployments = db
      .prepare('SELECT * FROM deployments WHERE app_id = ? ORDER BY id DESC LIMIT 20')
      .all(app.id)
      .map(serializeDeployment)
    const appData = serializeApp(app)
    let runtime = null
    if (app.container_id) {
      try {
        runtime = await getExecutor().inspect(app.container_id)
      } catch {
        runtime = { status: 'unknown', running: false }
      }
    }
    return ok(res, {
      ...appData,
      url: app.host_port ? (config.publicHost ? `${config.publicHost}/${app.slug}` : `http://localhost:${app.host_port}`) : '',
      deployments,
      runtime,
      executor: getExecutorInfo(),
    })
  }),
)

router.put(
  '/paas/apps/:id',
  asyncHandler(async (req, res) => {
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(Number(req.params.id))
    if (!app) throw new BusinessError('应用不存在', 404)
    const payload = normalizeAppPayload(req.body || {}, app)
    db.prepare(
      `UPDATE apps SET name = ?, source_type = ?, repo_url = ?, branch = ?, dockerfile = ?, image = ?, port = ?, cpu = ?, memory_mb = ?, replicas = ?, env_json = ?, auto_deploy = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      payload.name,
      payload.sourceType,
      payload.repoUrl,
      payload.branch,
      payload.dockerfile,
      payload.image,
      payload.port,
      payload.cpu,
      payload.memoryMb,
      payload.replicas,
      JSON.stringify(payload.env),
      payload.autoDeploy ? 1 : 0,
      now(),
      app.id,
    )
    logEvent(app.id, 'info', '更新应用配置')
    return ok(res, serializeApp(db.prepare('SELECT * FROM apps WHERE id = ?').get(app.id)), '已保存')
  }),
)

router.delete(
  '/paas/apps/:id',
  asyncHandler(async (req, res) => {
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(Number(req.params.id))
    if (!app) throw new BusinessError('应用不存在', 404)
    const executor = getExecutor()
    if (app.container_id) {
      try {
        await executor.remove(app.container_id)
      } catch {
        // 忽略清理失败
      }
    }
    db.prepare('DELETE FROM deployments WHERE app_id = ?').run(app.id)
    db.prepare('DELETE FROM events WHERE app_id = ?').run(app.id)
    db.prepare('DELETE FROM apps WHERE id = ?').run(app.id)
    return ok(res, null, '应用已删除')
  }),
)

router.post(
  '/paas/apps/:id/deploy',
  asyncHandler(async (req, res) => {
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(Number(req.params.id))
    if (!app) throw new BusinessError('应用不存在', 404)
    const deployment = createDeployment(app, { trigger: req.body?.trigger || 'manual' })
    return ok(res, serializeDeployment(deployment), '部署已开始')
  }),
)

router.post(
  '/paas/apps/:id/rollback',
  asyncHandler(async (req, res) => {
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(Number(req.params.id))
    if (!app) throw new BusinessError('应用不存在', 404)
    const target = db
      .prepare('SELECT * FROM deployments WHERE id = ? AND app_id = ?')
      .get(Number(req.body?.deploymentId), app.id)
    if (!target) throw new BusinessError('目标部署不存在', 404)
    if (target.status !== 'running') throw new BusinessError('只能回滚到状态为运行中的历史版本')
    const deployment = createRollbackDeployment(app, target)
    return ok(res, serializeDeployment(deployment), '回滚已开始')
  }),
)

router.post(
  '/paas/apps/:id/actions',
  asyncHandler(async (req, res) => {
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(Number(req.params.id))
    if (!app) throw new BusinessError('应用不存在', 404)
    const action = String(req.body?.action || '')
    const executor = getExecutor()

    if (action === 'start' || action === 'restart') {
      if (!app.container_id) throw new BusinessError('该应用还没有可用的容器，请先部署', 400)
      // restart 对已停止容器同样生效：Docker 会重新拉起，模拟驱动会恢复运行态
      try {
        await executor.restart(app.container_id)
      } catch {
        throw new BusinessError('容器已不可用（可能已被清理），请重新部署或回滚到可用版本', 400)
      }
      db.prepare('UPDATE apps SET status = ?, updated_at = ? WHERE id = ?').run('running', now(), app.id)
      logEvent(app.id, 'info', action === 'restart' ? '重启应用' : '启动应用')
      return ok(res, { status: 'running' })
    }

    if (action === 'stop') {
      if (app.container_id) await executor.stop(app.container_id)
      db.prepare('UPDATE apps SET status = ?, updated_at = ? WHERE id = ?').run('stopped', now(), app.id)
      logEvent(app.id, 'info', '停止应用')
      return ok(res, { status: 'stopped' })
    }

    throw new BusinessError('不支持的操作')
  }),
)

router.get(
  '/paas/apps/:id/logs',
  asyncHandler(async (req, res) => {
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(Number(req.params.id))
    if (!app) throw new BusinessError('应用不存在', 404)
    if (!app.container_id) throw new BusinessError('应用尚未部署，暂无运行日志')
    const tail = Math.min(1000, Number(req.query.tail || 200))
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.write(`event: ready\ndata: {"containerId":"${app.container_id}"}\n\n`)
    const controller = new AbortController()
    req.on('close', () => controller.abort())
    try {
      for await (const line of getExecutor().logs(app.container_id, { tail, signal: controller.signal })) {
        res.write(`data: ${JSON.stringify(line)}\n\n`)
      }
    } catch (error) {
      res.write(`event: error\ndata: ${JSON.stringify(error.message)}\n\n`)
    } finally {
      res.end()
    }
  }),
)

router.get(
  '/paas/apps/:id/metrics',
  asyncHandler(async (req, res) => {
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(Number(req.params.id))
    if (!app) throw new BusinessError('应用不存在', 404)
    if (!app.container_id) return ok(res, { cpuPercent: 0, memoryMb: 0, memoryLimitMb: 0 })
    try {
      const stats = await getExecutor().stats(app.container_id)
      return ok(res, stats)
    } catch {
      return ok(res, { cpuPercent: 0, memoryMb: 0, memoryLimitMb: 0 })
    }
  }),
)

router.get(
  '/paas/apps/:id/deployments',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare('SELECT * FROM deployments WHERE app_id = ? ORDER BY id DESC LIMIT 50')
      .all(Number(req.params.id))
    return ok(res, rows.map(serializeDeployment))
  }),
)

router.get(
  '/paas/deployments/:id',
  asyncHandler(async (req, res) => {
    const deployment = getDeploymentRow(Number(req.params.id))
    if (!deployment) throw new BusinessError('部署记录不存在', 404)
    const log = getDeploymentLogs(deployment.id)
    return ok(res, { ...deployment, log })
  }),
)

/** 部署日志 SSE：先推送已有日志，再实时订阅 */
router.get(
  '/paas/deployments/:id/stream',
  asyncHandler(async (req, res) => {
    const deployment = getDeploymentRow(Number(req.params.id))
    if (!deployment) throw new BusinessError('部署记录不存在', 404)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    const history = getDeploymentLogs(deployment.id)
    if (history) {
      for (const line of history.split('\n')) {
        res.write(`data: ${JSON.stringify(line)}\n\n`)
      }
    }
    res.write(`event: status\ndata: ${JSON.stringify({ status: deployment.status })}\n\n`)
    if (['running', 'failed'].includes(deployment.status)) {
      res.write('event: end\ndata: {}\n\n')
      return res.end()
    }
    const unsubscribe = subscribeDeployment(deployment.id, (line) => {
      res.write(`data: ${JSON.stringify(line)}\n\n`)
    })
    const timer = setInterval(() => {
      const row = db.prepare('SELECT status FROM deployments WHERE id = ?').get(deployment.id)
      if (!row) return
      res.write(`event: status\ndata: ${JSON.stringify({ status: row.status })}\n\n`)
      if (row.status === 'running' || row.status === 'failed') {
        res.write('event: end\ndata: {}\n\n')
        cleanup()
      }
    }, 1500)
    const cleanup = () => {
      clearInterval(timer)
      unsubscribe()
      res.end()
    }
    req.on('close', cleanup)
  }),
)

export default router
