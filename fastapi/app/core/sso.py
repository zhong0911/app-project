"""SSO 客户端（对标 Spring Boot 的 OAuth2 Client：授权码登录 + revoke 退出）。

流程与前端约定（全后端统一）：

```
前端 → GET /sso/authorize?redirect_uri=/xxx → 302 到 SSO /oauth2/authorize（带 state）
SSO 登录/同意 → 回调 GET /sso/callback?code=...&state=...
本服务 → POST /oauth2/token 换 access_token / refresh_token → 写会话
→ 302 到会话里的 redirect_uri（前端透传的页面）；没有则回退 SSO_LOGIN_SUCCESS_URL
退出：POST /api/auth/logout → 撤销 refresh_token（RFC 7009）→ 销毁会话
```
"""

import re
import secrets
from urllib.parse import urlencode, urlsplit

import httpx

from app.common.result_code import ResultCode
from app.core.config import settings
from app.core.exceptions import BusinessException


def build_authorize_url(state: str) -> str:
    """拼装授权跳转地址。"""

    query = urlencode(
        {
            "response_type": "code",
            "client_id": settings.sso_client_id,
            "redirect_uri": settings.sso_redirect_uri,
            "scope": settings.sso_scope,
            "state": state,
        }
    )
    sep = "&" if "?" in settings.sso_authorization_uri else "?"
    return f"{settings.sso_authorization_uri}{sep}{query}"


def new_state() -> str:
    """生成 state（防 CSRF，存会话后回调时校验）。"""

    return secrets.token_urlsafe(24)


def sanitize_redirect_uri(raw: str | None) -> str | None:
    """校验登录成功后的回跳地址（防开放重定向）。

    前端访问 /sso/authorize 时用 redirect_uri 透传要回跳的页面（如 /admin/users），
    后端存会话、回调成功后 302 过去。规则：

    1. 站内相对路径（单个 / 开头）：放行，浏览器按当前页面源解析，
       开发（前端 3000 代理 /sso）与生产同域部署都能回到前端；
    2. 绝对 http(s) 地址：origin 必须命中 CORS 允许来源白名单（前后端不同域部署时用）；
    3. 协议相对（//evil.com）、反斜杠变体（/\\evil.com）、控制字符、超长地址：判非法。

    非法返回 None，由调用方回退 settings.sso_login_success_url。
    """

    if not raw:
        return None
    target = raw.strip()
    if not target or len(target) > 2048:
        return None
    # 控制字符（含换行）会污染响应头
    if any(ord(ch) < 0x20 or ord(ch) == 0x7F for ch in target):
        return None
    if target.startswith("/"):
        if target.startswith("//") or target.startswith("/\\"):
            return None
        return target
    if not re.match(r"^https?://", target, re.IGNORECASE):
        return None
    try:
        parts = urlsplit(target)
    except ValueError:
        return None
    if not parts.scheme or not parts.hostname:
        return None
    try:
        origin = _origin(parts)
    except ValueError:
        return None
    for allowed in settings.cors_origins:
        try:
            allowed_parts = urlsplit(allowed.strip())
            if (
                allowed_parts.scheme
                and allowed_parts.hostname
                and _origin(allowed_parts) == origin
            ):
                return target
        except ValueError:
            continue
    return None


def _origin(parts) -> str:
    """提取 origin（scheme://host[:port]，默认端口省略）。"""

    scheme = parts.scheme.lower()
    host = (parts.hostname or "").lower()
    port = parts.port
    default_port = (scheme == "http" and port in (None, 80)) or (
        scheme == "https" and port in (None, 443)
    )
    return f"{scheme}://{host}" if default_port else f"{scheme}://{host}:{port}"


async def exchange_code(code: str) -> dict:
    """用授权码换 token（client_secret_post）。"""

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.sso_redirect_uri,
        "client_id": settings.sso_client_id,
        "client_secret": settings.sso_client_secret,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                settings.sso_token_uri,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if resp.status_code >= 400:
                raise BusinessException(
                    ResultCode.UNAUTHORIZED, f"SSO 换取 token 失败: HTTP {resp.status_code}"
                )
            return resp.json()
    except BusinessException:
        raise
    except Exception as exc:
        raise BusinessException(ResultCode.UNAUTHORIZED, f"SSO 不可达: {exc}") from exc


async def fetch_userinfo(access_token: str) -> dict:
    """获取用户资料（sub 即用户 uid）。"""

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                settings.sso_userinfo_uri,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code >= 400:
                raise BusinessException(
                    ResultCode.UNAUTHORIZED, f"获取 SSO 用户信息失败: HTTP {resp.status_code}"
                )
            return resp.json()
    except BusinessException:
        raise
    except Exception as exc:
        raise BusinessException(ResultCode.UNAUTHORIZED, f"SSO 不可达: {exc}") from exc


async def revoke_token(token: str, token_type_hint: str = "refresh_token") -> bool:
    """撤销 token（RFC 7009）。失败仅记录，不阻塞退出（与 Spring 模板一致）。"""

    if not token or not settings.sso_revoke_uri:
        return False
    data = {
        "token": token,
        "token_type_hint": token_type_hint,
        "client_id": settings.sso_client_id,
        "client_secret": settings.sso_client_secret,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                settings.sso_revoke_uri,
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            return resp.status_code < 400
    except Exception:
        return False
