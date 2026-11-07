import crypto from 'node:crypto'
import express from 'express'
import { createSession, setSessionCookie, upsertSsoUser } from '../auth.js'
import { config } from '../config.js'
import { logEvent } from '../db.js'
import { asyncHandler, parseCookies } from '../http.js'
import { buildAuthorizeUrl, callbackUri, exchangeCode, fetchUserinfo, ssoEnabled } from '../sso.js'

const router = express.Router()
const SSO_STATE_COOKIE = 'paas_sso_state'

/** 登录成功/失败后的回跳目标：只允许站内相对路径 */
function safeTarget(value) {
  if (typeof value !== 'string') return '/apps'
  if (!value.startsWith('/') || value.startsWith('//')) return '/apps'
  return value
}

/** SSO 入口：302 到 AntX Passport 授权页（授权码模式） */
router.get(
  '/authorize',
  asyncHandler(async (req, res) => {
    if (!ssoEnabled()) {
      logEvent(null, 'warn', 'SSO 未配置 client_id/client_secret，回退本地登录')
      return res.redirect('/login?sso=disabled')
    }
    const target = safeTarget(req.query.redirect_uri)
    const state = crypto.randomBytes(16).toString('hex')
    const payload = `${state}.${Buffer.from(target).toString('base64url')}`
    res.append('Set-Cookie', `${SSO_STATE_COOKIE}=${payload}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`)
    const url = await buildAuthorizeUrl({ redirectUri: callbackUri(req), state })
    return res.redirect(url)
  }),
)

/** SSO 回调：校验 state → 换 token → 拉用户资料 → 建平台会话 → 回跳前端 */
router.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const stateCookie = parseCookies(req)[SSO_STATE_COOKIE]
    if (req.query.error) {
      logEvent(null, 'warn', `SSO 授权失败：${String(req.query.error_description || req.query.error)}`)
      return res.redirect('/login?sso=denied')
    }
    const [storedState, encodedTarget] = String(stateCookie || '').split('.')
    if (!storedState || storedState !== req.query.state) {
      logEvent(null, 'warn', 'SSO 回调 state 校验失败')
      return res.redirect('/login?sso=state')
    }
    try {
      const tokens = await exchangeCode({ code: String(req.query.code || ''), redirectUri: callbackUri(req) })
      const profile = await fetchUserinfo(tokens)
      if (!profile?.sub) throw new Error('未获取到 SSO 用户标识')
      const isAdmin =
        String(profile.sub) === String(config.sso.adminUid) ||
        (Array.isArray(profile.roles) && profile.roles.includes('admin'))
      const user = upsertSsoUser(profile, { isAdmin })
      const { token, expiresAt } = createSession(user.id, tokens.id_token || '')
      setSessionCookie(res, token, expiresAt)
      res.append('Set-Cookie', `${SSO_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
      logEvent(null, 'info', `SSO 登录成功：${user.username}`)
      const target = encodedTarget ? Buffer.from(encodedTarget, 'base64url').toString('utf8') : '/apps'
      return res.redirect(safeTarget(target))
    } catch (error) {
      logEvent(null, 'error', `SSO 回调处理失败：${error.message}`)
      return res.redirect('/login?sso=error')
    }
  }),
)

export default router
