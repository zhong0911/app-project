"""管理后台用户管理接口（仅管理员可访问，对标 Spring Boot AdminUserController）。

  - GET    /api/admin/users               用户列表（不含回收站）
  - POST   /api/admin/users               添加用户（指定 SSO uid）
  - PUT    /api/admin/users/{id}/status   启用 / 禁用
  - DELETE /api/admin/users/{id}          软删除（移入回收站）
  - GET    /api/admin/users/recycle       回收站列表
  - POST   /api/admin/users/{id}/restore  从回收站恢复
  - DELETE /api/admin/users/{id}/purge    彻底删除
"""
from __future__ import annotations

from fastapi import APIRouter, Path, Query, Request
from pydantic import BaseModel, Field

from ..business_exception import BusinessException
from ..page_result import PageResult
from ..result import Result
from ..result_code import ResultCode
from ..security import require_admin
from .. import user_repo

router = APIRouter(prefix="/api/admin/users", tags=["管理后台-用户"])


class UserCreate(BaseModel):
    """添加用户入参：唯一标识为 SSO uid（access_token 的 sub）。"""
    uid: str = Field(..., min_length=1, max_length=64, description="SSO 用户 uid")


class StatusUpdate(BaseModel):
    """启停状态入参。"""
    status: int = Field(..., ge=0, le=1, description="1-启用，0-禁用")


@router.get("")
def page(
    request: Request,
    page_num: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    uid: str | None = Query(default=None),
    status: int | None = Query(default=None, ge=0, le=1),
) -> dict:
    """用户列表（deleted=0）。"""
    require_admin(request)
    total, records = user_repo.page(page_num, page_size, uid, status, 0)
    return Result.success_with(PageResult(page_num, page_size, total, records).to_dict())


@router.get("/recycle")
def recycle(
    request: Request,
    page_num: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    uid: str | None = Query(default=None),
) -> dict:
    """回收站列表（deleted=1）。"""
    require_admin(request)
    total, records = user_repo.page(page_num, page_size, uid, None, 1)
    return Result.success_with(PageResult(page_num, page_size, total, records).to_dict())


@router.post("")
def create(request: Request, body: UserCreate) -> dict:
    """添加用户（指定 SSO uid）。"""
    require_admin(request)
    return Result.success_with(user_repo.create(body.uid))


@router.put("/{user_id}/status")
def update_status(request: Request, body: StatusUpdate,
                  user_id: int = Path(..., description="用户 id")) -> dict:
    """启用 / 禁用用户。"""
    require_admin(request)
    return Result.success_with(user_repo.update_status(user_id, body.status))


@router.delete("/{user_id}")
def delete(request: Request, user_id: int = Path(..., description="用户 id")) -> dict:
    """软删除（移入回收站）。"""
    require_admin(request)
    user_repo.soft_delete(user_id)
    return Result.success()


@router.post("/{user_id}/restore")
def restore(request: Request, user_id: int = Path(..., description="用户 id")) -> dict:
    """从回收站恢复。"""
    require_admin(request)
    return Result.success_with(user_repo.restore(user_id))


@router.delete("/{user_id}/purge")
def purge(request: Request, user_id: int = Path(..., description="用户 id")) -> dict:
    """彻底删除（仅回收站中的用户）。"""
    require_admin(request)
    user_repo.purge(user_id)
    return Result.success()
