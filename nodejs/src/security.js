import { BusinessException } from './business-exception.js';
import { ResultCode } from './result-code.js';
import { getSession, parseSessionId } from './oauth2.js';
import { getByUid } from './user-repo.js';

/**
 * 当前 SSO 用户身份解析 + 管理员判定。
 *
 * 用户唯一标识为 access_token 的 sub（SSO uid）；管理员 uid 由 SSO_ADMIN_UID 配置，默认 1。
 */

/** 从 JWT access_token 解析 sub（不验签，token 由本应用从 SSO token 端点获取） */
export function decodeSub(token) {
  if (!token || token.split('.').length !== 3) return null;
  try {
    const payload = token.split('.')[1];
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const sub = JSON.parse(json).sub;
    return sub === undefined || sub === null ? null : String(sub);
  } catch {
    return null;
  }
}

function accessToken(req) {
  const auth = req.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  const tokens = getSession(parseSessionId(req));
  return tokens ? tokens.access_token : null;
}

/** 解析当前登录用户的 SSO uid；未登录返回 null */
export function currentUid(req) {
  const tokens = getSession(parseSessionId(req));
  if (tokens && tokens.uid) return String(tokens.uid);
  return decodeSub(accessToken(req));
}

export function adminUid() {
  return process.env.SSO_ADMIN_UID || '1';
}

export function isAdmin(uid) {
  return Boolean(uid) && uid === adminUid();
}

/** 管理接口鉴权：未登录 401，非管理员 403，被禁用的管理员 403 */
export async function requireAdmin(req) {
  const uid = currentUid(req);
  if (!uid) {
    throw new BusinessException(ResultCode.UNAUTHORIZED);
  }
  if (!isAdmin(uid)) {
    throw new BusinessException(ResultCode.FORBIDDEN, '仅管理员可访问');
  }
  const local = await getByUid(uid);
  if (local && Number(local.status) === 0) {
    throw new BusinessException(ResultCode.FORBIDDEN, '账号已被禁用');
  }
  return uid;
}
