/**
 * 认证接口（对标 Spring Boot 的 controller/AuthController）。
 * GET /api/auth/me、POST /api/auth/logout
 */
import { config } from '../config/index.js';
import { revokeToken } from '../utils/sso.js';
import { success } from '../utils/result.js';

export function me(req, res) {
  const principal = req.principal;
  if (!principal?.uid) return res.json(success({}));

  const data = { authenticated: true };
  if (principal.authType === 'sso-jwt') {
    data.type = 'sso-jwt';
    data.subject = principal.uid;
    data.claims = principal.claims;
  } else if (principal.authType === 'sso-login') {
    data.type = 'sso-login';
    data.clientRegistrationId = 'sso';
    data.name = principal.name;
    data.attributes = { sub: principal.uid, preferred_username: principal.name };
  } else {
    data.type = 'basic';
    data.name = principal.name;
  }
  return res.json(success(data));
}

export async function logout(req, res, next) {
  try {
    // 1) 优先撤销 refresh_token，没有则撤销 access_token
    const refreshToken = req.session?.refreshToken;
    const accessToken = req.session?.accessToken;
    if (refreshToken) await revokeToken(refreshToken, 'refresh_token');
    else if (accessToken) await revokeToken(accessToken, 'access_token');

    // 2) 销毁本地会话
    req.session?.destroy(() => {});

    // 3) 返回 SSO 登出地址（前端整页跳转可完成全局退出）
    res.json(success({ ssoLogoutUrl: config.sso.logoutUri || null }));
  } catch (error) {
    next(error);
  }
}
