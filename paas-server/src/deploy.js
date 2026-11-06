import { EventEmitter } from 'node:events'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { config } from './config.js'
import { db, logEvent, now, serializeApp, serializeDeployment } from './db.js'
import { getExecutor } from './executor/index.js'

const run = promisify(execFile)
const emitters = new Map()

function emitterFor(deploymentId) {
  if (!emitters.has(deploymentId)) {
    emitters.set(deploymentId, new EventEmitter())
  }
  return emitters.get(deploymentId)
}

export function subscribeDeployment(deploymentId, listener) {
  const emitter = emitterFor(deploymentId)
  emitter.on('log', listener)
  return () => emitter.off('log', listener)
}

/** 分配宿主端口：从配置起点开始找未被占用的端口 */
export function allocatePort() {
  const used = new Set(
    db
      .prepare('SELECT host_port FROM apps WHERE host_port IS NOT NULL')
      .all()
      .map((row) => row.host_port),
  )
  let port = config.portRangeStart
  while (used.has(port)) port += 1
  return port
}

function appAccessUrl(app, hostPort) {
  if (config.publicHost) return `${config.publicHost}/${app.slug}`
  return `http://localhost:${hostPort}`
}

function appendLog(deploymentId, text, buffer) {
  const line = text.replace(/\r/g, '')
  if (!line.trim()) return
  buffer.lines.push(`[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ${line}`)
  emitterFor(deploymentId).emit('log', line)
  if (buffer.lines.length > 4000) buffer.lines.splice(0, buffer.lines.length - 4000)
  if (buffer.lines.length % 20 === 0) {
    db.prepare('UPDATE deployments SET log = ? WHERE id = ?').run(buffer.lines.join('\n'), deploymentId)
  }
}

function updateDeployment(deploymentId, patch) {
  const keys = Object.keys(patch)
  const sql = `UPDATE deployments SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`
  db.prepare(sql).run(...keys.map((k) => patch[k]), deploymentId)
}

/** 克隆仓库到部署工作目录 */
async function checkoutSource(app, deploymentId, log) {
  const target = path.join(config.workDir, 'apps', String(app.id), String(deploymentId))
  fs.rmSync(target, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(target), { recursive: true })
  log(`克隆仓库 ${app.repo_url}（分支 ${app.branch || 'main'}）`)
  try {
    await run('git', ['clone', '--depth', '1', '--branch', app.branch || 'main', app.repo_url, target], {
      timeout: 180000,
    })
  } catch (error) {
    throw new Error(`Git 克隆失败：${(error.stderr || error.message).trim()}`)
  }
  let commitSha = ''
  try {
    const result = await run('git', ['rev-parse', '--short', 'HEAD'], { cwd: target })
    commitSha = result.stdout.trim()
    log(`当前提交 ${commitSha}`)
  } catch {
    // 忽略
  }
  return { dir: target, commitSha }
}

/**
 * 执行一次部署（异步）：
 * - 源码构建：git clone → docker build → 启动容器
 * - 镜像部署 / 回滚：直接使用已有镜像
 */
export async function executeDeployment(deploymentId) {
  const deployment = db.prepare('SELECT * FROM deployments WHERE id = ?').get(deploymentId)
  if (!deployment) return
  const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(deployment.app_id)
  if (!app) return

  const executor = getExecutor()
  const buffer = { lines: [] }
  const log = (text) => appendLog(deploymentId, text, buffer)
  const tag = `antx-paas/${app.slug}:${deployment.number}`

  updateDeployment(deploymentId, { status: 'building' })
  db.prepare('UPDATE apps SET status = ?, updated_at = ? WHERE id = ?').run('building', now(), app.id)
  logEvent(app.id, 'info', `开始部署 #${deployment.number}`)

  try {
    let imageTag = deployment.image_tag
    if (deployment.source_type === 'git') {
      const { dir, commitSha } = await checkoutSource(app, deploymentId, log)
      if (commitSha) updateDeployment(deploymentId, { commit_sha: commitSha })
      log(`构建镜像 ${tag}`)
      await executor.build({ contextDir: dir, tag, dockerfile: app.dockerfile || 'Dockerfile', onLog: log })
      imageTag = tag
      updateDeployment(deploymentId, { image_tag: imageTag })
    } else if (!imageTag) {
      throw new Error('镜像部署缺少镜像地址')
    }

    if (deployment.source_type === 'image' && imageTag && !imageTag.startsWith('antx-paas/')) {
      await executor.pullImage(imageTag, log)
    }

    updateDeployment(deploymentId, { status: 'deploying' })

    const previous = db.prepare('SELECT * FROM apps WHERE id = ?').get(app.id)
    const hostPort = previous.host_port || allocatePort()
    const containerName = `paas-${app.slug}`
    log(`启动容器 ${containerName}`)
    const { containerId } = await executor.run({
      containerName,
      image: imageTag,
      app: serializeApp(app),
      hostPort,
      onLog: log,
    })

    const health = await executor.inspect(containerId)
    if (!health.running) {
      throw new Error('容器启动后未处于运行状态，请检查应用日志')
    }

    if (previous.container_id && previous.container_id !== containerId) {
      log('停止并移除上一版本容器')
      try {
        await executor.remove(previous.container_id)
      } catch (error) {
        log(`清理旧容器失败：${error.message}`)
      }
    }

    updateDeployment(deploymentId, {
      status: 'running',
      container_id: containerId,
      finished_at: now(),
    })
    db.prepare(
      'UPDATE apps SET status = ?, container_id = ?, host_port = ?, updated_at = ? WHERE id = ?',
    ).run('running', containerId, hostPort, now(), app.id)
    log(`部署成功，访问地址 ${appAccessUrl(serializeApp(app), hostPort)}`)
    logEvent(app.id, 'success', `部署 #${deployment.number} 成功`)
  } catch (error) {
    const message = error?.message || String(error)
    log(`部署失败：${message}`)
    updateDeployment(deploymentId, { status: 'failed', error: message, finished_at: now() })
    db.prepare('UPDATE apps SET status = ?, updated_at = ? WHERE id = ?').run(
      app.container_id ? 'running' : 'failed',
      now(),
      app.id,
    )
    logEvent(app.id, 'error', `部署 #${deployment.number} 失败：${message}`)
  } finally {
    db.prepare('UPDATE deployments SET log = ? WHERE id = ?').run(buffer.lines.join('\n'), deploymentId)
  }
}

/** 创建部署记录并入队执行 */
export function createDeployment(app, { trigger = 'manual', sourceType, imageTag = '', skipBuild = false } = {}) {
  const last = db.prepare('SELECT MAX(number) AS n FROM deployments WHERE app_id = ?').get(app.id)
  const number = (last?.n || 0) + 1
  const type = sourceType || app.source_type
  const image = imageTag || (type === 'image' ? app.image : '')
  const info = db
    .prepare(
      `INSERT INTO deployments (app_id, number, status, trigger, source_type, image_tag, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(app.id, number, 'queued', trigger, type, image, now())

  const deploymentId = Number(info.lastInsertRowid)
  // 异步执行，接口立即返回部署 ID 供前端订阅日志
  setImmediate(() => {
    executeDeployment(deploymentId).catch((error) => {
      const message = error?.message || String(error)
      updateDeployment(deploymentId, { status: 'failed', error: message, finished_at: now() })
    })
  })
  return db.prepare('SELECT * FROM deployments WHERE id = ?').get(deploymentId)
}

/** 回滚：用历史成功部署的镜像重新启动容器，不重新构建 */
export function createRollbackDeployment(app, deployment) {
  if (!deployment?.image_tag) {
    throw new Error('该部署没有可回滚的镜像')
  }
  return createDeployment(app, {
    trigger: 'rollback',
    sourceType: 'image',
    imageTag: deployment.image_tag,
  })
}

export function getDeploymentRow(id) {
  return serializeDeployment(db.prepare('SELECT * FROM deployments WHERE id = ?').get(id))
}

export function getDeploymentLogs(id) {
  const row = db.prepare('SELECT log FROM deployments WHERE id = ?').get(id)
  return row?.log || ''
}
