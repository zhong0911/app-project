import { Router } from 'express';
import { Result } from '../result.js';
import { ResultCode } from '../result-code.js';
import {
  buildAuthorizeUrl,
  buildProviders,
  consumeState,
  createSession,
  destroySession,
  exchangeCode,
  getSession,
  parseSessionId,
  revokeTokens,
  sessionCookie,
} from '../oauth2.js';

/**
 * OAuth2 客户端路由（全后端统一规范路径）。
 *
 *   - GET  /oauth2/{provider}/authorize   跳转到授权服务器
 *   - GET  /oauth2/{provider}/callback    接收授权码 code，换取 token，重定向回登录成功页
 *   - POST /api/auth/logout               单点退出（撤销 refresh_token + 销毁会话）
 */
export const authRouter = Router();

// 认证 API 路由（/api/auth/*，对标 Spring Boot AuthController）
export const authApiRouter = Router();

function baseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

// 跳转到授权服务器（对标 Spring Security 授权入口）
authRouter.get('/:provider/authorize', (req, res) => {
  const { provider } = req.params;
  if (!buildProviders()[provider]) {
    return res.status(404).json(Result.error(ResultCode.NOT_FOUND));
  }
  const { url } = buildAuthorizeUrl(provider, baseUrl(req));
  console.log(`[OAuth] 跳转授权服务器: provider=${provider}`);
  res.redirect(url);
});

// 接受授权码，换取 token（对标 Spring Security 回调处理）
authRouter.get('/:provider/callback', async (req, res, next) => {
  const { provider } = req.params;
  const { code, state } = req.query;
  if (!buildProviders()[provider]) {
    return res.status(404).json(Result.error(ResultCode.NOT_FOUND));
  }
  if (!consumeState(state, provider)) {
    // state 校验失败（CSRF / 过期），按统一格式返回错误
    return res.status(400).json(Result.errorMsg(ResultCode.BAD_REQUEST, 'state 校验失败'));
  }
  if (typeof code !== 'string' || code === '') {
    return res.status(400).json(Result.errorMsg(ResultCode.BAD_REQUEST, '缺少授权码 code'));
  }
  try {
    const token = await exchangeCode(provider, code, baseUrl(req));
    // token 存服务端会话（access_token/refresh_token 不进浏览器），cookie 仅存会话 id
    res.setHeader('Set-Cookie', sessionCookie(createSession(token)));
  } catch (e) {
    console.error('[OAuth] token 换取失败', e);
    return res.status(400).json(Result.errorMsg(ResultCode.BAD_REQUEST, 'token 换取失败'));
  }
  console.log(`[OAuth] 授权码换 token 成功: provider=${provider}`);
  // 登录成功：重定向回登录成功页（对标 Spring Security defaultSuccessUrl）
  res.redirect(buildProviders()[provider].loginSuccessUrl);
});

// 单点退出（对标 Spring Boot AuthController#logout）：
// 撤销 SSO 侧 refresh_token -> 销毁服务端会话 -> 清除 cookie；
// 返回 ssoLogoutUrl（env SSO_LOGOUT_URI）供前端整页跳转完成 SSO 全局退出
authApiRouter.post('/logout', async (req, res) => {
  const sid = parseSessionId(req);
  const tokens = getSession(sid);
  if (tokens) await revokeTokens(tokens);
  destroySession(sid);
  res.setHeader('Set-Cookie', sessionCookie(null));
  res.json(Result.successWith({ ssoLogoutUrl: process.env.SSO_LOGOUT_URI || null }));
});
