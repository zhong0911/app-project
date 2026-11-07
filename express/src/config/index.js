/**
 * 全局配置（对标 Spring Boot 的 application.yml）。
 * 通过 `node --env-file-if-exists=.env` 加载环境变量，未配置时用默认值兜底。
 */
const env = process.env;

const splitList = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const config = {
  app: {
    name: 'express-template',
    port: Number(env.SERVER_PORT || 8080),
    debug: env.DEBUG !== 'false',
  },

  // ---- 数据库（统一一个 DB_URL，或以 DB_HOST/DB_PORT/... 分项配置） ----
  db: {
    url: env.DB_URL || '',
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USERNAME || 'root',
    password: env.DB_PASSWORD || 'root',
    database: env.DB_DATABASE || 'antx_template',
    connectionLimit: Number(env.DB_POOL_SIZE || 10),
  },

  // ---- 会话（SSO token 存服务端会话，前端只拿 Cookie） ----
  session: {
    secret: env.SESSION_SECRET || 'change-me-session-secret',
    name: env.SESSION_COOKIE_NAME || 'SESSION',
    maxAge: Number(env.SESSION_MAX_AGE || 1800) * 1000,
  },

  // ---- CORS（可带 Cookie 的来源，逗号分隔，不能用 *） ----
  cors: {
    origins: splitList(env.CORS_ALLOWED_ORIGINS, 'http://localhost:3000,http://localhost:5173'),
  },

  // ---- 本地联调 Basic（生产置 SECURITY_BASIC_ENABLED=false） ----
  security: {
    basicEnabled: env.SECURITY_BASIC_ENABLED !== 'false',
    adminUsername: env.SECURITY_ADMIN_USERNAME || 'admin',
    adminPassword: env.SECURITY_ADMIN_PASSWORD || 'admin123',
  },

  // ---- SSO（AntX passport-sso） ----
  sso: {
    issuer: env.SSO_ISSUER || 'https://passport.antx.cc',
    clientId: env.SSO_CLIENT_ID || 'your-sso-client-id',
    clientSecret: env.SSO_CLIENT_SECRET || 'your-sso-client-secret',
    scope: env.SSO_SCOPE || 'openid,profile,email,roles,permissions',
    redirectUri: env.SSO_REDIRECT_URI || 'http://localhost:8080/sso/callback',
    authorizationUri: env.SSO_AUTHORIZATION_URI || 'https://passport.antx.cc/oauth2/authorize',
    tokenUri: env.SSO_TOKEN_URI || 'https://passport.antx.cc/oauth2/token',
    userinfoUri: env.SSO_USERINFO_URI || 'https://passport.antx.cc/userinfo',
    jwksUri: env.SSO_JWKS_URI || 'https://passport.antx.cc/oauth2/jwks',
    revokeUri: env.SSO_REVOKE_URI || 'https://passport.antx.cc/oauth2/revoke',
    loginSuccessUrl: env.SSO_LOGIN_SUCCESS_URL || '/api/auth/me',
    logoutUri: env.SSO_LOGOUT_URI || '',
    adminUid: env.SSO_ADMIN_UID || '1',
  },
};
