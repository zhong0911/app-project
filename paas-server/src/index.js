import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { config, isProd } from './config.js'
import { seedAdmin } from './db.js'
import { initExecutor, getExecutorInfo } from './executor/index.js'
import appsRouter from './routes/apps.js'
import authRouter from './routes/auth.js'
import overviewRouter from './routes/overview.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', executor: getExecutorInfo() })
})

app.use('/api', authRouter)
app.use('/api', appsRouter)
app.use('/api', overviewRouter)

app.use('/api', (req, res) => {
  res.status(404).json({ code: 404, data: null, message: `接口不存在：${req.method} ${req.originalUrl}` })
})

/** 生产模式：同域托管前端构建产物 */
if (isProd && fs.existsSync(config.webDist)) {
  app.use(express.static(config.webDist, { index: false, maxAge: '1h' }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/sso')) return next()
    res.sendFile(path.join(config.webDist, 'index.html'))
  })
}

// 统一错误处理
app.use((error, req, res, next) => {
  const status = error.status || error.statusCode || 500
  if (status >= 500) console.error('[paas]', error)
  res.status(status).json({
    code: status,
    data: null,
    message: error.message || '服务器内部错误',
  })
})

async function bootstrap() {
  seedAdmin()
  const executor = await initExecutor()
  const info = getExecutorInfo()
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`\n  AntX PaaS 服务已启动  http://localhost:${config.port}`)
    console.log(`  执行层: ${info.type} (${info.target}) ${info.fallback ? '· Docker 不可用，已降级' : ''}`)
    console.log(`  默认管理员: ${config.adminUser}\n`)
    if (info.fallback) {
      console.log(`  ! Docker 探测失败：${info.reason}`)
      console.log('    生产环境请确认 Docker 可用或配置 DOCKER_MODE=tcp / DOCKER_HOST\n')
    }
    void executor
  })
}

bootstrap().catch((error) => {
  console.error('启动失败:', error)
  process.exit(1)
})
