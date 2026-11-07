import crypto from 'node:crypto'
import { config } from './config.js'
import { db, now, verifyPassword } from './db.js'
import { parseCookies } from './http.js'

const COOKIE = 'paas_session'

export function createSession(userId, idToken = '') {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = Date.now() + config.sessionHours * 3600 * 1000
  db.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at, id_token) VALUES (?, ?, ?, ?, ?)').run(
    token,
    userId,
    expiresAt,
    now(),
    idToken,
  )
  return { token, expiresAt }
}

export function destroySession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function setSessionCookie(res, token, expiresAt) {
  res.append(
    'Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor((expiresAt - Date.now()) / 1000)}`,
  )
}

export function clearSessionCookie(res) {
  res.append('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

export function getUserFromRequest(req) {
  const token = parseCookies(req)[COOKIE]
  if (!token) return null
  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token)
  if (!session) return null
  if (session.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id)
  if (!user || user.status !== 'active') return null
  return {
    id: user.id,
    username: user.username,
    name: user.name || user.username,
    email: user.email || '',
    avatar: user.avatar || '',
    ssoSub: user.sso_sub || '',
    role: user.role,
    token,
    idToken: session.id_token || '',
  }
}

export function requireAuth(req, res, next) {
  const user = getUserFromRequest(req)
  if (!user) {
    return res.status(401).json({ code: 401, data: null, message: '未登录或会话已过期' })
  }
  req.user = user
  next()
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ code: 403, data: null, message: '需要管理员权限' })
  }
  next()
}

export function authenticate(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user || user.status !== 'active') return null
  if (!verifyPassword(password, user.password_hash)) return null
  return user
}

/**
 * 根据 SSO 用户资料落库（按 sub 幂等）：返回平台用户
 * 用户名冲突时追加 sub 后缀，避免覆盖本地账号
 */
export function upsertSsoUser(profile, { isAdmin = false } = {}) {
  const sub = String(profile.sub || '').trim()
  if (!sub) throw new Error('SSO 用户缺少 sub')

  const name = profile.name || profile.nickname || profile.preferred_username || profile.email || `用户 ${sub}`
  const email = profile.email || ''
  const avatar = profile.avatar || profile.picture || ''
  const timestamp = now()

  const existing = db.prepare('SELECT * FROM users WHERE sso_sub = ?').get(sub)
  if (existing) {
    db.prepare('UPDATE users SET name = ?, email = ?, avatar = ?, last_login_at = ? WHERE id = ?').run(
      name,
      email,
      avatar,
      timestamp,
      existing.id,
    )
    if (isAdmin && existing.role !== 'admin') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', existing.id)
    }
    return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id)
  }

  let username = String(profile.preferred_username || profile.username || email.split('@')[0] || `sso_${sub}`)
    .trim()
    .slice(0, 48)
  if (!username) username = `sso_${sub}`
  const taken = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (taken) username = `${username}_${sub.slice(-6)}`

  const info = db
    .prepare('INSERT INTO users (username, password_hash, role, status, created_at, sso_sub, name, email, avatar, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(username, '', isAdmin ? 'admin' : 'user', 'active', timestamp, sub, name, email, avatar, timestamp)
  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
}
