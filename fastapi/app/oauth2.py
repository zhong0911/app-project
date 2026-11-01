"""OAuth2 客户端（授权码模式，对标 Spring Boot 模板 spring.security.oauth2.client）。

规范路径（全后端统一）：
  - 跳转到授权服务器：GET /oauth2/{provider}/authorize
  - 接受授权码     ：GET /oauth2/{provider}/callback?code=...&state=...

默认注册一个 provider：sso（对标 Spring Security registration "sso"），
配置从环境变量读取（对标 application.yml 的 SSO_*）。
"""
from __future__ import annotations

import secrets
import time
import urllib.parse
from dataclasses import dataclass
from os import environ


@dataclass
class OAuthProviderConfig:
    """单个 OAuth2 客户端注册（对标 ClientRegistration）。"""
    name: str
    client_id: str
    client_secret: str
    authorization_uri: str
    token_uri: str
    userinfo_uri: str | None
    scope: str
    login_success_url: str


def _env(key: str, default: str = "") -> str:
    return environ.get(key, default)


def build_providers() -> dict[str, OAuthProviderConfig]:
    """从环境变量构造 provider 注册表。

    对标 Spring Boot 模板：SSO_CLIENT_ID / SSO_CLIENT_SECRET / SSO_ISSUER，
    端点留空时由 SSO_ISSUER 推导标准路径。
    """
    issuer = _env("SSO_ISSUER").rstrip("/")
    providers: dict[str, OAuthProviderConfig] = {}
    client_id = _env("SSO_CLIENT_ID")
    if client_id:
        providers["sso"] = OAuthProviderConfig(
            name="sso",
            client_id=client_id,
            client_secret=_env("SSO_CLIENT_SECRET"),
            authorization_uri=_env("SSO_AUTHORIZATION_URI") or f"{issuer}/oauth2/authorize",
            token_uri=_env("SSO_TOKEN_URI") or f"{issuer}/oauth2/token",
            userinfo_uri=_env("SSO_USERINFO_URI") or (f"{issuer}/userinfo" if issuer else None),
            scope=_env("SSO_SCOPE", "openid,profile,email,roles,permissions"),
            login_success_url=_env("SSO_LOGIN_SUCCESS_URL", "/"),
        )
    return providers


# ---- state 存储（内存，带过期；生产建议换 Redis / 会话） ----
_STATE_STORE: dict[str, tuple[str, float]] = {}
_STATE_TTL = 600  # 秒


def _new_state(provider: str) -> str:
    state = secrets.token_urlsafe(32)
    _STATE_STORE[state] = (provider, time.time())
    return state


def consume_state(state: str, provider: str) -> bool:
    """校验并消费 state，防止 CSRF。校验通过且未过期返回 True。"""
    entry = _STATE_STORE.pop(state, None)
    if entry is None:
        return False
    saved_provider, created = entry
    if saved_provider != provider or time.time() - created > _STATE_TTL:
        return False
    return True


def build_authorize_url(provider: str, base_url: str) -> tuple[str, str]:
    """构造授权服务器跳转 URL，返回 (url, state)。"""
    cfg = build_providers()[provider]
    redirect_uri = f"{base_url}/oauth2/{provider}/callback"
    state = _new_state(provider)
    params = urllib.parse.urlencode({
        "response_type": "code",
        "client_id": cfg.client_id,
        "redirect_uri": redirect_uri,
        "scope": cfg.scope,
        "state": state,
    })
    return f"{cfg.authorization_uri}?{params}", state
