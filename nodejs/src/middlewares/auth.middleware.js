/**
 * 认证中间件（对标 Spring Boot 的 SecurityConfig + JwtAuthenticationConverter）。
 *
 * 三种登录态：
 * - sso-login：会话里存了 uid（浏览器走过 /sso/callback）
 * - sso-jwt：Authorization: Bearer <token>，用 JWKS 验签
 * - basic：本地联调（SECURITY_BASIC_ENABLED 控制）
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config/index.js';
import { BusinessError } from '../utils/business-error.js';
import { currentUserService } from '../services/current-user.service.js';

const jwks = createRemoteJWKSet(new URL(config.sso.jwksUri));

const ANONYMOUS = { uid: null, name: null, authType: 'anonymous' };

async function verifyBearer(token) {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.sso.issuer,
      // 子应用不校验 audience（与 Spring 模板一致）
    });
    const uid = payload.sub !== undefined ? String(payload.sub) : null;
    return {
      uid,
      name: payload.preferred_username || payload.name || uid,
      authType: 'sso-jwt',
      claims: payload,
    };
  } catch (error) {
    throw BusinessError.unauthorized(`令牌无效: ${error.message}`);
  }
}

function verifyBasic(header) {
  if (!config.security.basicEnabled) throw BusinessError.unauthorized();
  let decoded = '';
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    throw BusinessError.unauthorized();
  }
  const [username, password] = decoded.split(':');
  if (username !== config.security.adminUsername || password !== config.security.adminPassword) {
    throw BusinessError.unauthorized();
  }
  return { uid: username, name: username, authType: 'basic', claims: {} };
}

/** 解析身份挂到 req.principal（不抛异常，未登录为匿名） */
export async function attachPrincipal(req, _res, next) {
  try {
    if (req.session?.uid) {
      req.principal = { uid: String(req.session.uid), name: req.session.name, authType: 'sso-login', claims: {} };
    } else {
      const authorization = req.headers.authorization || '';
      if (authorization.toLowerCase().startsWith('bearer ')) {
        req.principal = await verifyBearer(authorization.slice(7).trim());
      } else if (authorization.toLowerCase().startsWith('basic ')) {
        req.principal = verifyBasic(authorization);
      } else {
        req.principal = { ...ANONYMOUS };
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

/** 要求登录，否则 401 */
export function requireLogin(req, _res, next) {
  if (!req.principal?.uid) return next(BusinessError.unauthorized());
  next();
}

/** 要求管理员，否则 401 / 403 */
export async function requireAdmin(req, res, next) {
  try {
    await currentUserService.requireAdmin(req.principal);
    next();
  } catch (error) {
    next(error);
  }
}
