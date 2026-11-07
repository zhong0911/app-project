/**
 * SSO 登录入口（对标 Spring Boot 的 controller/OAuth2LoginController）。
 * 路径全后端统一：GET /sso/authorize、GET /sso/callback
 */
import { config } from '../config/index.js';
import { buildAuthorizeUrl, exchangeCode, fetchUserInfo, newState, sanitizeRedirectUri } from '../utils/sso.js';
import { BusinessError } from '../utils/business-error.js';
import { userService } from '../services/user.service.js';

/**
 * 302 跳 SSO 登录页（带 state，存会话供回调校验）。
 * 可带 ?redirect_uri=<前端回跳地址>（站内路径或白名单内的绝对地址）：校验后存会话，回调成功后直接跳过去。
 */
export function authorize(req, res) {
  const state = newState();
  req.session.ssoState = state;
  // 回跳地址与 state 同会话保存，回调成功时消费一次
  const target = sanitizeRedirectUri(req.query.redirect_uri);
  if (target) {
    req.session.ssoRedirectUri = target;
  } else {
    delete req.session.ssoRedirectUri;
  }
  res.redirect(302, buildAuthorizeUrl(state));
}

/** SSO 回调：校验 state → 换 token → 取用户信息 → 写会话 → 跳登录成功页 */
export async function callback(req, res, next) {
  try {
    const { code, state } = req.query;
    const expected = req.session.ssoState;
    delete req.session.ssoState;
    if (!code || !expected || state !== expected) {
      throw BusinessError.badRequest('state 校验失败，请重新登录');
    }

    const token = await exchangeCode(String(code));
    if (!token.access_token) throw BusinessError.unauthorized('SSO 未返回 access_token');

    const userInfo = await fetchUserInfo(token.access_token);
    if (userInfo.sub === undefined) throw BusinessError.unauthorized('SSO 未返回用户标识 sub');

    // 身份 + token 全部留在服务端会话；前端只拿到会话 Cookie
    req.session.uid = String(userInfo.sub);
    req.session.name = userInfo.preferred_username || userInfo.name || String(userInfo.sub);
    req.session.accessToken = token.access_token;
    req.session.refreshToken = token.refresh_token;

    // 新用户默认注册为 USER
    await userService.getOrCreateDefaultUser(String(userInfo.sub));

    // 优先跳前端透传的回跳地址（已在 /sso/authorize 校验过），否则用配置的兜底地址
    const redirectUri = req.session.ssoRedirectUri;
    delete req.session.ssoRedirectUri;
    res.redirect(302, redirectUri || config.sso.loginSuccessUrl);
  } catch (error) {
    next(error);
  }
}
