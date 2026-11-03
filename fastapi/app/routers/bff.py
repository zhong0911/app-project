"""BFF 聚合接口（对标 Spring Boot BffController）。

GET /api/bff/me：一次返回当前 SSO 身份 + 本地角色 + 是否管理员 + 启停状态，
前端无需理解 OAuth2 / JWT 细节。未登录返回 401。
"""
from __future__ import annotations

from fastapi import APIRouter, Request

from ..business_exception import BusinessException
from ..result import Result
from ..result_code import ResultCode
from ..security import current_uid, is_admin
from .. import user_repo

router = APIRouter(prefix="/api/bff", tags=["BFF"])


@router.get("/me")
def me(request: Request) -> dict:
    uid = current_uid(request)
    if not uid:
        raise BusinessException(ResultCode.UNAUTHORIZED)

    local = user_repo.get_by_uid(uid)
    vo = {
        "authType": "sso",
        "uid": uid,
        "name": uid,
        "role": local.get("role") if local else None,
        "isAdmin": is_admin(uid),
        "status": local.get("status") if local else None,
        "localId": local.get("id") if local else None,
    }
    return Result.success_with(vo)
