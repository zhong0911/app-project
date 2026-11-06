import express from 'express'
import { authenticate, clearSessionCookie, createSession, destroySession, getUserFromRequest, requireAuth, setSessionCookie } from '../auth.js'
import { db, now } from '../db.js'
import { BusinessError, asyncHandler, ok } from '../http.js'
import { config } from '../config.js'

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

router.post('/auth/logout', (req, res) => {
  const user = getUserFromRequest(req)
  destroySession(user?.token)
  clearSessionCookie(res)
  return ok(res, { ssoLogoutUrl: '' })
})

/** BFF 聚合登录态：与 vue 模板约定一致 */
router.get('/bff/me', (req, res) => {
  const user = getUserFromRequest(req)
  if (!user) return res.status(401).json({ code: 401, data: null, message: '未登录' })
  return ok(res, {
    uid: user.id,
    id: user.id,
    username: user.username,
    name: user.username,
    role: user.role,
    isAdmin: user.role === 'admin',
  })
})

/** 兼容模板的 SSO 入口：未配置外部 IdP 时引导到本地登录页 */
router.get('/sso/authorize', (req, res) => {
  const redirect = typeof req.query.redirect_uri === 'string' ? req.query.redirect_uri : ''
  const query = redirect ? `?redirect_uri=${encodeURIComponent(redirect)}` : ''
  res.redirect(`/login${query}`)
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
