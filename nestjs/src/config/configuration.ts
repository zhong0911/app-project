/**
 * 全局配置（对标 Spring Boot 的 application.yml）。
 * 通过 @nestjs/config 读取环境变量，未配置时用默认值兜底。
 */
export const configuration = () => ({
  app: {
    name: process.env.APP_NAME ?? 'nestjs-template',
    port: Number(process.env.SERVER_PORT ?? 8080),
  },

  // ---- 数据库（TypeORM 数据源） ----
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? 'root',
    database: process.env.DB_DATABASE ?? 'antx_template',
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },

  // ---- 会话（SSO token 存服务端会话） ----
  session: {
    secret: process.env.SESSION_SECRET ?? 'change-me-session-secret',
    name: process.env.SESSION_COOKIE_NAME ?? 'SESSION',
    maxAge: Number(process.env.SESSION_MAX_AGE ?? 1800) * 1000,
  },

  // ---- CORS ----
  cors: {
    origins: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  },

  // ---- 本地联调 Basic（生产置 false 或直接改守卫） ----
  security: {
    basicEnabled: process.env.SECURITY_BASIC_ENABLED !== 'false',
    adminUsername: process.env.SECURITY_ADMIN_USERNAME ?? 'admin',
    adminPassword: process.env.SECURITY_ADMIN_PASSWORD ?? 'admin123',
  },

  // ---- SSO（AntX passport-sso） ----
  sso: {
    issuer: process.env.SSO_ISSUER ?? 'https://passport.antx.cc',
    clientId: process.env.SSO_CLIENT_ID ?? 'your-sso-client-id',
    clientSecret: process.env.SSO_CLIENT_SECRET ?? 'your-sso-client-secret',
    scope: process.env.SSO_SCOPE ?? 'openid,profile,email,roles,permissions',
    redirectUri: process.env.SSO_REDIRECT_URI ?? 'http://localhost:8080/sso/callback',
    authorizationUri: process.env.SSO_AUTHORIZATION_URI ?? 'https://passport.antx.cc/oauth2/authorize',
    tokenUri: process.env.SSO_TOKEN_URI ?? 'https://passport.antx.cc/oauth2/token',
    userinfoUri: process.env.SSO_USERINFO_URI ?? 'https://passport.antx.cc/userinfo',
    jwksUri: process.env.SSO_JWKS_URI ?? 'https://passport.antx.cc/oauth2/jwks',
    revokeUri: process.env.SSO_REVOKE_URI ?? 'https://passport.antx.cc/oauth2/revoke',
    loginSuccessUrl: process.env.SSO_LOGIN_SUCCESS_URL ?? '/',
    logoutUri: process.env.SSO_LOGOUT_URI ?? '',
    adminUid: process.env.SSO_ADMIN_UID ?? '1',
  },
});

export type AppConfig = ReturnType<typeof configuration>;
