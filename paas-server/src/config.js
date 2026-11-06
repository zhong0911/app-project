import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const baseDir = path.resolve(rootDir, '..')

/** 轻量 .env 读取：避免为一个依赖再引入 dotenv */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const text = line.trim()
    if (!text || text.startsWith('#')) continue
    const idx = text.indexOf('=')
    if (idx === -1) continue
    const key = text.slice(0, idx).trim()
    let value = text.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvFile(path.join(baseDir, '.env'))

const dataDir = path.join(baseDir, 'data')
const workDir = path.join(dataDir, 'workspace')
fs.mkdirSync(dataDir, { recursive: true })
fs.mkdirSync(workDir, { recursive: true })

export const config = {
  baseDir,
  dataDir,
  workDir,
  dbFile: path.join(dataDir, 'paas.db'),
  port: Number(process.env.PORT || process.env.PAAS_PORT || 8080),
  executor: (process.env.PAAS_EXECUTOR || 'auto').toLowerCase(),
  docker: {
    mode: process.env.DOCKER_MODE || 'socket',
    socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    host: process.env.DOCKER_HOST || '',
  },
  publicHost: (process.env.PAAS_PUBLIC_HOST || '').replace(/\/$/, ''),
  portRangeStart: Number(process.env.PAAS_PORT_RANGE_START || 20000),
  sessionHours: Number(process.env.PAAS_SESSION_HOURS || 72),
  adminUser: process.env.PAAS_ADMIN_USER || 'admin',
  adminPassword: process.env.PAAS_ADMIN_PASSWORD || 'admin123456',
  // 生产模式下直接托管前端构建产物
  webDist: process.env.PAAS_WEB_DIST || path.resolve(baseDir, '../vue/dist'),
}

export const isProd = process.env.NODE_ENV === 'production'
