/**
 * SSO 客户端（对标 Spring Boot 的 OAuth2 Client）：授权码登录 + revoke 退出。
 */
import { randomBytes } from 'node:crypto';
import { config } from '../config/index.js';
import { BusinessError } from './business-error.js';
import { ResultCode } from './result-code.js';

/** 生成 state（防 CSRF，存会话后回调校验） */
export const newState = () => randomBytes(24).toString('base64url');

/** 拼装授权跳转地址 */
export function buildAuthorizeUrl(state) {
  const url = new URL(config.sso.authorizationUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.sso.clientId);
  url.searchParams.set('redirect_uri', config.sso.redirectUri);
  url.searchParams.set('scope', config.sso.scope);
  url.searchParams.set('state', state);
  return url.toString();
}

/** 用授权码换 token（client_secret_post） */
export async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.sso.redirectUri,
    client_id: config.sso.clientId,
    client_secret: config.sso.clientSecret,
  });

  let response;
  try {
    response = await fetch(config.sso.tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    throw new BusinessError(ResultCode.UNAUTHORIZED, `SSO 不可达: ${err.message}`);
  }
  if (!response.ok) {
    throw new BusinessError(ResultCode.UNAUTHORIZED, `SSO 换取 token 失败: HTTP ${response.status}`);
  }
  return response.json();
}

/** 获取用户资料（sub 即用户 uid） */
export async function fetchUserInfo(accessToken) {
  let response;
  try {
    response = await fetch(config.sso.userinfoUri, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    throw new BusinessError(ResultCode.UNAUTHORIZED, `SSO 不可达: ${err.message}`);
  }
  if (!response.ok) {
    throw new BusinessError(ResultCode.UNAUTHORIZED, `获取 SSO 用户信息失败: HTTP ${response.status}`);
  }
  return response.json();
}

/** 撤销 token（RFC 7009）；失败只记日志，不阻塞退出 */
export async function revokeToken(token, hint = 'refresh_token') {
  if (!token || !config.sso.revokeUri) return false;
  try {
    const body = new URLSearchParams({
      token,
      token_type_hint: hint,
      client_id: config.sso.clientId,
      client_secret: config.sso.clientSecret,
    });
    const response = await fetch(config.sso.revokeUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch (err) {
    console.warn('[SSO] revoke 失败（忽略，不阻塞退出）:', err.message);
    return false;
  }
}
