import { Router } from 'express';
import { Result } from '../result.js';
import { ResultCode } from '../result-code.js';
import { buildAuthorizeUrl, buildProviders, consumeState, exchangeCode } from '../oauth2.js';

/**
 * OAuth2 客户端路由（全后端统一规范路径）。
 *
 *   - GET /oauth2/{provider}/authorize   跳转到授权服务器
 *   - GET /oauth2/{provider}/callback    接收授权码 code，换取 token，重定向回登录成功页
 */
export const authRouter = Router();

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
    await exchangeCode(provider, code, baseUrl(req));
  } catch (e) {
    console.error('[OAuth] token 换取失败', e);
    return res.status(400).json(Result.errorMsg(ResultCode.BAD_REQUEST, 'token 换取失败'));
  }
  console.log(`[OAuth] 授权码换 token 成功: provider=${provider}`);
  // 登录成功：重定向回登录成功页（对标 Spring Security defaultSuccessUrl）
  res.redirect(buildProviders()[provider].loginSuccessUrl);
});
