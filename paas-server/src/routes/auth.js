import express from 'express'
import {
  authenticate,
  clearSessionCookie,
  createSession,
  destroySession,
  getUserFromRequest,
  requireAuth,
  setSessionCookie,
} from '../auth.js'
import { db, logEvent, now } from '../db.js'
import { BusinessError, asyncHandler, ok } from '../http.js'
import { config } from '../config.js'
import { buildLogoutUrl, publicBaseUrl, ssoEnabled } from '../sso.js'

const router = express.Router()

router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {}
    if (!username || !password) throw new BusinessError('请输入用户名和密码')
    const user = authenticate(String(username).trim(), String(password))
    if (!user) throw new BusinessError('用户名或密码错误', 401)
    const { token, expiresAt } = createSession(user.id)
    setSessionCookie(res, token, expiresAt)
    return ok(res, { id: user.id, username: user.username, role: user.role })
  }),
)

router.post(
  '/auth/logout',
  asyncHandler(async (req, res) => {
    const user = getUserFromRequest(req)
    destroySession(user?.token)
    clearSessionCookie(res)
    let ssoLogoutUrl = ''
    if (ssoEnabled()) {
      ssoLogoutUrl = await buildLogoutUrl({
        idTokenHint: user?.idToken || '',
        postLogoutRedirectUri: `${publicBaseUrl(req)}/login`,
      })
    }
    return ok(res, { ssoLogoutUrl })
  }),
)

/** BFF 聚合登录态：与 vue 模板约定一致 */
router.get('/bff/me', (req, res) => {
  const user = getUserFromRequest(req)
  if (!user) return res.status(401).json({ code: 401, data: null, message: '未登录' })
  return ok(res, {
    uid: user.id,
    id: user.id,
    username: user.username,
    name: user.name || user.username,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    isAdmin: user.role === 'admin',
    sso: !!user.ssoSub,
  })
})

/** 用户管理（管理员）：平台账号 */
router.get(
  '/paas/users',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') throw new BusinessError('需要管理员权限', 403)
    const rows = db.prepare('SELECT id, username, role, status, created_at FROM users ORDER BY id').all()
    return ok(res, rows)
  }),
)

router.post(
  '/paas/users',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') throw new BusinessError('需要管理员权限', 403)
    const { username, password, role = 'user' } = req.body || {}
    if (!username || !password) throw new BusinessError('用户名和密码不能为空')
    if (String(password).length < 8) throw new BusinessError('密码至少 8 位')
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(String(username).trim())
    if (exists) throw new BusinessError('用户名已存在')
    const { hashPassword } = await import('../db.js')
    db.prepare('INSERT INTO users (username, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?)').run(
      String(username).trim(),
      hashPassword(String(password)),
      role === 'admin' ? 'admin' : 'user',
      'active',
      now(),
    )
    return ok(res, null, '用户已创建')
  }),
)

/** 开发环境提示：默认管理员仅在首次启动创建 */
router.get('/paas/bootstrap-info', (req, res) => {
  return ok(res, {
    adminUser: config.adminUser,
    executor: config.executor,
  })
})

export default router
