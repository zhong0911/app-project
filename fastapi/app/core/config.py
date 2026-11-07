"""全局配置（对标 Spring Boot 的 application.yml）：

所有值优先从环境变量读取，其次读 `.env`，最后用默认值兜底。
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置。

    环境变量名大小写不敏感，`DB_URL` 即对应 `db_url`。
    """

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ---- 应用 ----
    app_name: str = "fastapi-template"
    server_port: int = 8080
    debug: bool = True

    # ---- 数据库（统一一个 DB_URL，含驱动/主机/库名/参数） ----
    db_url: str = "mysql+pymysql://root:root@localhost:3306/antx_template?charset=utf8mb4"
    db_echo: bool = False

    # ---- 会话（SSO token 存服务端会话，前端只拿 Cookie） ----
    session_secret: str = "change-me-session-secret"
    session_cookie_name: str = "SESSION"
    session_max_age: int = 1800

    # ---- CORS（可带 Cookie 的来源，逗号分隔，不能用 *） ----
    cors_allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    # ---- 本地联调（无 SSO 时的 Basic 用户，生产关闭） ----
    security_basic_enabled: bool = True
    security_admin_username: str = "admin"
    security_admin_password: str = "admin123"

    # ---- SSO（AntX passport-sso，OAuth2 授权码 + Bearer JWT） ----
    sso_issuer: str = "https://passport.antx.cc"
    sso_client_id: str = "your-sso-client-id"
    sso_client_secret: str = "your-sso-client-secret"
    sso_scope: str = "openid,profile,email,roles,permissions"
    # 回调地址：必须在 SSO 控制台登记，全后端统一路径 /sso/callback
    sso_redirect_uri: str = "http://localhost:8080/sso/callback"
    sso_authorization_uri: str = "https://passport.antx.cc/oauth2/authorize"
    sso_token_uri: str = "https://passport.antx.cc/oauth2/token"
    sso_userinfo_uri: str = "https://passport.antx.cc/userinfo"
    sso_jwks_uri: str = "https://passport.antx.cc/oauth2/jwks"
    sso_revoke_uri: str = "https://passport.antx.cc/oauth2/revoke"
    # 登录成功后前端跳转地址（生产指向子应用首页，如 https://tools.antx.cc）
    sso_login_success_url: str = "/api/auth/me"
    # 单点退出地址（留空则只退出本应用）
    sso_logout_uri: str = ""
    # 管理员 uid（= access_token 的 sub），默认 1
    sso_admin_uid: str = "1"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """单例配置（等价 Spring 的 @ConfigurationProperties Bean）。"""

    return Settings()


settings = get_settings()
