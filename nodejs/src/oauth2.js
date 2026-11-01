import { randomBytes } from 'node:crypto';

/**
 * OAuth2 客户端（授权码模式，对标 Spring Boot 模板 spring.security.oauth2.client）。
 *
 * 规范路径（全后端统一）：
 *   - 跳转到授权服务器：GET /oauth2/{provider}/authorize
 *   - 接受授权码     ：GET /oauth2/{provider}/callback?code=...&state=...
 *
 * 默认注册一个 provider：sso（对标 Spring Security registration "sso"），
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

/** 构造授权服务器跳转 URL。 */
export function buildAuthorizeUrl(provider, baseUrl) {
  const cfg = buildProviders()[provider];
  if (!cfg) throw new Error('provider not found');
  const redirectUri = `${baseUrl}/oauth2/${provider}/callback`;
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
  const redirectUri = `${baseUrl}/oauth2/${provider}/callback`;
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
