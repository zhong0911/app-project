"""SSO 客户端（对标 Spring Boot 的 OAuth2 Client：授权码登录 + revoke 退出）。

流程与前端约定（全后端统一）：

```
前端 → GET /sso/authorize → 302 到 SSO /oauth2/authorize（带 state）
SSO 登录/同意 → 回调 GET /sso/callback?code=...&state=...
本服务 → POST /oauth2/token 换 access_token / refresh_token → 写会话
→ 302 到 SSO_LOGIN_SUCCESS_URL（前端首页）
退出：POST /api/auth/logout → 撤销 refresh_token（RFC 7009）→ 销毁会话
```
"""

import secrets
from urllib.parse import urlencode

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
