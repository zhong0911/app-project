"""当前 SSO 用户身份解析 + 管理员判定。

用户唯一标识为 access_token 的 sub（即 SSO uid）；管理员 uid 由 SSO_ADMIN_UID 配置，
默认 1。
"""
from __future__ import annotations

import base64
import json
import os
from typing import Any

from fastapi import Request

from .business_exception import BusinessException
from .oauth2 import SESSION_COOKIE, get_session
from .result_code import ResultCode
from . import user_repo


def _decode_sub(token: str | None) -> str | None:
    """从 JWT access_token 解析 sub（不验签，token 由本应用从 SSO token 端点获取）。"""
    if not token or token.count(".") != 2:
        return None
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload))
        sub = data.get("sub")
        return str(sub) if sub is not None else None
    except Exception:  # noqa: BLE001
        return None


def _access_token(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    tokens = get_session(request.cookies.get(SESSION_COOKIE))
    return tokens.get("access_token") if tokens else None


def current_uid(request: Request) -> str | None:
    """解析当前登录用户的 SSO uid；未登录返回 None。"""
    tokens: dict[str, Any] | None = get_session(request.cookies.get(SESSION_COOKIE))
    if tokens and tokens.get("uid"):
        return str(tokens["uid"])
    return _decode_sub(_access_token(request))


def admin_uid() -> str:
    return os.getenv("SSO_ADMIN_UID", "1")


def is_admin(uid: str | None) -> bool:
    return bool(uid) and uid == admin_uid()


def require_admin(request: Request) -> str:
    """管理接口鉴权：未登录 401，非管理员 403，被禁用的管理员 403。"""
    uid = current_uid(request)
    if not uid:
        raise BusinessException(ResultCode.UNAUTHORIZED)
    if not is_admin(uid):
        raise BusinessException(ResultCode.FORBIDDEN, "仅管理员可访问")
    local = user_repo.get_by_uid(uid)
    if local is not None and int(local.get("status") or 0) == 0:
        raise BusinessException(ResultCode.FORBIDDEN, "账号已被禁用")
    return uid
