"""认证与授权（对标 Spring Boot 的 config/security/ + LocalRoleGrantedAuthoritiesConverter）。

三种登录态与 Spring 模板一一对应：

| 场景 | 来源 | authType |
|---|---|---|
| SSO 浏览器登录 | 服务端会话里的 SSO 身份 | `sso-login` |
| SSO Bearer Token | `Authorization: Bearer <access_token>`（校验 JWKS 验签） | `sso-jwt` |
| 本地联调 | HTTP Basic（内存用户） | `basic` |

角色本地化（方案B）：SSO 只负责认证，子应用用本地 `users.role` 决定权限。
"""

import base64
import binascii
from dataclasses import dataclass

import jwt
from fastapi import Depends, Request
from jwt import PyJWKClient
from sqlalchemy.orm import Session

from app.common.result_code import ResultCode
from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import BusinessException
from app.models.user import User
from app.repository.user_repo import UserRepository

jwks_client = PyJWKClient(settings.sso_jwks_uri, cache_keys=True)


@dataclass
class Principal:
    """当前登录身份。"""

    uid: str | None
    name: str | None
    auth_type: str
    claims: dict


def _verify_bearer(token: str) -> dict:
    """校验 SSO 签发的 JWT（JWKS 验签 + issuer + exp）。"""

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            issuer=settings.sso_issuer,
            options={"verify_aud": False},
        )
    except Exception as exc:  # 令牌无效 / SSO 不可达，统一 401
        raise BusinessException(ResultCode.UNAUTHORIZED) from exc


def _verify_basic(authorization: str) -> str:
    """本地联调 Basic 认证，返回用户名（作为 uid）。"""

    if not settings.security_basic_enabled:
        raise BusinessException(ResultCode.UNAUTHORIZED)
    try:
        raw = base64.b64decode(authorization.split(" ", 1)[1]).decode("utf-8")
        username, _, password = raw.partition(":")
    except (IndexError, binascii.Error, UnicodeDecodeError) as exc:
        raise BusinessException(ResultCode.UNAUTHORIZED) from exc
    if username != settings.security_admin_username or password != settings.security_admin_password:
        raise BusinessException(ResultCode.UNAUTHORIZED)
    return username


def get_principal(request: Request) -> Principal:
    """解析当前身份（未登录返回匿名 Principal，不抛异常）。"""

    # 1) SSO 浏览器登录：会话里存了 uid
    session_uid = request.session.get("uid")
    if session_uid:
        return Principal(
            uid=str(session_uid),
            name=request.session.get("name"),
            auth_type="sso-login",
            claims={},
        )

    # 2) Bearer Token
    authorization = request.headers.get("Authorization", "")
    if authorization.lower().startswith("bearer "):
        claims = _verify_bearer(authorization.split(" ", 1)[1])
        uid = str(claims.get("sub")) if claims.get("sub") is not None else None
        name = claims.get("preferred_username") or claims.get("name") or uid
        return Principal(uid=uid, name=name, auth_type="sso-jwt", claims=claims)

    # 3) 本地联调 Basic
    if authorization.lower().startswith("basic "):
        username = _verify_basic(authorization)
        return Principal(uid=username, name=username, auth_type="basic", claims={})

    return Principal(uid=None, name=None, auth_type="anonymous", claims={})


def require_login(principal: Principal = Depends(get_principal)) -> Principal:
    """要求已登录，否则 401（等价 Spring 的 anyRequest().authenticated()）。"""

    if not principal.uid:
        raise BusinessException(ResultCode.UNAUTHORIZED)
    return principal


def local_user(principal: Principal, db: Session) -> User | None:
    """按 uid 查本地用户（未注册返回 None）。"""

    if not principal.uid:
        return None
    return UserRepository(db).get_by_uid(principal.uid)


def is_admin(principal: Principal) -> bool:
    """管理员判定：uid 等于 SSO_ADMIN_UID（默认 1）。"""

    return bool(principal.uid) and principal.uid == settings.sso_admin_uid


def require_admin(
    principal: Principal = Depends(require_login),
    db: Session = Depends(get_db),
) -> Principal:
    """管理接口鉴权：未登录 401，非管理员 403，被禁用 403。"""

    if not is_admin(principal):
        raise BusinessException(ResultCode.FORBIDDEN, "仅管理员可访问")
    user = local_user(principal, db)
    if user is not None and user.status == 0:
        raise BusinessException(ResultCode.FORBIDDEN, "账号已被禁用")
    return principal
