import crypto from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { config } from './config.js'

export const db = new DatabaseSync(config.dbFile)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
`)

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'git',
  repo_url TEXT DEFAULT '',
  branch TEXT DEFAULT 'main',
  dockerfile TEXT DEFAULT 'Dockerfile',
  image TEXT DEFAULT '',
  port INTEGER NOT NULL DEFAULT 80,
  cpu REAL NOT NULL DEFAULT 0.5,
  memory_mb INTEGER NOT NULL DEFAULT 512,
  replicas INTEGER NOT NULL DEFAULT 1,
  env_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'stopped',
  container_id TEXT DEFAULT '',
  host_port INTEGER,
  auto_deploy INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  trigger TEXT NOT NULL DEFAULT 'manual',
  source_type TEXT NOT NULL,
  image_tag TEXT DEFAULT '',
  commit_sha TEXT DEFAULT '',
  container_id TEXT DEFAULT '',
  log TEXT NOT NULL DEFAULT '',
  error TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id INTEGER,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deployments_app ON deployments(app_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_events_app ON events(app_id, id DESC);
`)

/** 兼容旧库：按需补充 SSO 相关列 */
function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  if (columns.some((item) => item.name === column)) return
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

ensureColumn('users', 'sso_sub', 'TEXT')
ensureColumn('users', 'name', 'TEXT')
ensureColumn('users', 'email', 'TEXT')
ensureColumn('users', 'avatar', 'TEXT')
ensureColumn('users', 'last_login_at', 'TEXT')
ensureColumn('sessions', 'id_token', 'TEXT')
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_sso_sub ON users(sso_sub) WHERE sso_sub IS NOT NULL')

export function now() {
  return new Date().toISOString()
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':')
  if (!salt || !hash) return false
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'))
}

/** 首次启动创建管理员账号 */
export function seedAdmin() {
  const row = db.prepare('SELECT COUNT(*) AS count FROM users').get()
  if (row.count > 0) return
  db.prepare('INSERT INTO users (username, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?)').run(
    config.adminUser,
    hashPassword(config.adminPassword),
    'admin',
    'active',
    now(),
  )
  logEvent(null, 'info', `初始化管理员账号 ${config.adminUser}`)
}

export function logEvent(appId, level, message) {
  db.prepare('INSERT INTO events (app_id, level, message, created_at) VALUES (?, ?, ?, ?)').run(
    appId ?? null,
    level,
    message,
    now(),
  )
}

export function serializeApp(row) {
  if (!row) return null
  let env = {}
  try {
    env = JSON.parse(row.env_json || '{}')
  } catch {
    env = {}
  }
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sourceType: row.source_type,
    repoUrl: row.repo_url,
    branch: row.branch,
    dockerfile: row.dockerfile,
    dockerfilePath: row.dockerfile,
    image: row.image,
    port: row.port,
    cpu: row.cpu,
    memoryMb: row.memory_mb,
    replicas: row.replicas,
    env,
    status: row.status,
    containerId: row.container_id,
    hostPort: row.host_port,
    autoDeploy: !!row.auto_deploy,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function serializeDeployment(row) {
  if (!row) return null
  return {
    id: row.id,
    appId: row.app_id,
    number: row.number,
    status: row.status,
    trigger: row.trigger,
    sourceType: row.source_type,
    imageTag: row.image_tag,
    commitSha: row.commit_sha,
    containerId: row.container_id,
    error: row.error,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  }
}
