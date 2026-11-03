import { randomBytes } from 'node:crypto';

/**
 * OAuth2 客户端（授权码模式，对标 Spring Boot 模板 spring.security.oauth2.client）。
 *
 * 规范路径（全后端统一）：
 *   - 跳转到授权服务器：GET /sso/authorize
 *   - 接受授权码     ：GET /sso/callback?code=...&state=...
 *
 * 本模板只接入 AntX SSO，provider 固定为 sso（对标 Spring Security registration "sso"），
 * 配置从环境变量读取（对标 application.yml 的 SSO_*）。
 */

function env(key, fallback = '') {
  return process.env[key] ?? fallback;
}

/** 从环境变量构造 provider 注册表（对标 SSO_*）。 */
export function buildProviders() {
  const providers = {};
  const issuer = env('SSO_ISSUER').replace(/\/+$/, '');
  const clientId = env('SSO_CLIENT_ID');
  if (clientId) {
    providers.sso = {
      name: 'sso',
      clientId,
      clientSecret: env('SSO_CLIENT_SECRET'),
      authorizationUri: env('SSO_AUTHORIZATION_URI') || `${issuer}/oauth2/authorize`,
      tokenUri: env('SSO_TOKEN_URI') || `${issuer}/oauth2/token`,
      userinfoUri: env('SSO_USERINFO_URI') || (issuer ? `${issuer}/userinfo` : ''),
      revokeUri: env('SSO_REVOKE_URI') || (issuer ? `${issuer}/oauth2/revoke` : ''),
      scope: env('SSO_SCOPE', 'openid,profile,email,roles,permissions'),
      loginSuccessUrl: env('SSO_LOGIN_SUCCESS_URL', '/'),
    };
  }
  return providers;
}

// ---- state 存储（内存，带过期；生产建议换 Redis / 会话） ----
const stateStore = new Map(); // state -> { provider, createdAt }
const STATE_TTL = 600_000; // 毫秒

function newState(provider) {
  const state = randomBytes(24).toString('hex');
  stateStore.set(state, { provider, createdAt: Date.now() });
  return state;
}

/** 校验并消费 state，防止 CSRF。 */
export function consumeState(state, provider) {
  const entry = stateStore.get(state);
  if (!entry) return false;
  stateStore.delete(state);
  return entry.provider === provider && Date.now() - entry.createdAt <= STATE_TTL;
}

// ---- 会话存储（内存；保存 SSO 换取的 access_token / refresh_token，退出时用于撤销。
//      token 仅存服务端，浏览器只持有 HttpOnly 的 app_session cookie；生产建议换 Redis） ----
export const SESSION_COOKIE = 'app_session';
const sessionStore = new Map(); // sid -> tokens

export function createSession(tokens) {
  const sid = randomBytes(24).toString('hex');
  sessionStore.set(sid, { ...tokens });
  return sid;
}

export function getSession(sid) {
  return sid ? sessionStore.get(sid) : undefined;
}

export function destroySession(sid) {
  if (sid) sessionStore.delete(sid);
}

/** 解析请求 Cookie 中的会话 id（模板不引入 cookie-parser，手写极简解析）。 */
export function parseSessionId(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(/(?:^|;\s*)app_session=([^;]+)/);
  return m ? m[1] : null;
}

/** Set-Cookie 值：sid 为空串表示清除。 */
export function sessionCookie(sid) {
  return sid
    ? `${SESSION_COOKIE}=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    : `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

/**
 * 调用 SSO 的 revoke 端点（RFC 7009）撤销会话中的 token：优先 refresh_token。
 * 撤销失败仅记日志，不阻塞退出流程。
 */
export async function revokeTokens(tokens) {
  const cfg = buildProviders().sso;
  if (!cfg?.revokeUri || !tokens) return;
  const refresh = tokens.refresh_token;
  const token = refresh || tokens.access_token;
  if (!token) return;
  try {
    const resp = await fetch(cfg.revokeUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token,
        token_type_hint: refresh ? 'refresh_token' : 'access_token',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      }).toString(),
    });
    console.log(`[SSO] revoke 完成: status=${resp.status}`);
  } catch (e) {
    console.warn(`[SSO] revoke 失败（忽略，不阻塞退出）: ${e.message}`);
  }
}

/** 构造授权服务器跳转 URL。 */
export function buildAuthorizeUrl(provider, baseUrl) {
  const cfg = buildProviders()[provider];
  if (!cfg) throw new Error('provider not found');
  const redirectUri = `${baseUrl}/sso/callback`;
  const state = newState(provider);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    scope: cfg.scope,
    state,
  });
  return { url: `${cfg.authorizationUri}?${params.toString()}`, state };
}

/** 用授权码换取 token（POST token 端点）。 */
export async function exchangeCode(provider, code, baseUrl) {
  const cfg = buildProviders()[provider];
  const redirectUri = `${baseUrl}/sso/callback`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  const resp = await fetch(cfg.tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!resp.ok) {
    throw new Error(`token 换取失败: HTTP ${resp.status}`);
  }
  return resp.json();
}
