import crypto from 'node:crypto'
import { config } from './config.js'
import { db, now, verifyPassword } from './db.js'
import { parseCookies } from './http.js'

const COOKIE = 'paas_session'

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = Date.now() + config.sessionHours * 3600 * 1000
  db.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    expiresAt,
    now(),
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
  return { id: user.id, username: user.username, role: user.role, token }
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
