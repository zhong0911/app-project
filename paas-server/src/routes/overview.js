import express from 'express'
import { config } from '../config.js'
import { db, serializeApp, serializeDeployment } from '../db.js'
import { getExecutorInfo } from '../executor/index.js'
import { asyncHandler, ok } from '../http.js'
import { requireAuth } from '../auth.js'

const router = express.Router()

router.get(
  '/paas/overview',
  requireAuth,
  asyncHandler(async (req, res) => {
    const apps = db.prepare('SELECT * FROM apps').all()
    const running = apps.filter((app) => app.status === 'running')
    const deployments = db.prepare('SELECT * FROM deployments ORDER BY id DESC LIMIT 200').all()
    const since = Date.now() - 24 * 3600 * 1000
    const todayDeployments = deployments.filter((row) => new Date(row.created_at).getTime() >= since)
    const successRate = deployments.length
      ? Math.round((deployments.filter((row) => row.status === 'running').length / deployments.length) * 100)
      : 0

    return ok(res, {
      executor: getExecutorInfo(),
      stats: {
        apps: apps.length,
        running: running.length,
        stopped: apps.filter((app) => app.status === 'stopped' || app.status === 'created').length,
        failed: apps.filter((app) => app.status === 'failed').length,
        deployments24h: todayDeployments.length,
        successRate,
        cpuCores: running.reduce((sum, app) => sum + Number(app.cpu || 0), 0),
        memoryMb: running.reduce((sum, app) => sum + Number(app.memory_mb || 0), 0),
      },
      recentApps: apps.slice(0, 5).map(serializeApp),
      recentDeployments: deployments.slice(0, 8).map((row) => {
        const app = apps.find((item) => item.id === row.app_id)
        return { ...serializeDeployment(row), appName: app?.name || '', appSlug: app?.slug || '' }
      }),
      events: db
        .prepare('SELECT * FROM events ORDER BY id DESC LIMIT 10')
        .all()
        .map((row) => ({
          id: row.id,
          appId: row.app_id,
          level: row.level,
          message: row.message,
          createdAt: row.created_at,
        })),
      publicHost: config.publicHost,
    })
  }),
)

export default router
