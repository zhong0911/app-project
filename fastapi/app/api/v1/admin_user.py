"""管理后台用户管理（对标 Spring Boot 的 controller/AdminUserController）。

仅管理员可访问；管理员由 `SSO_ADMIN_UID`（默认 1）判定。
删除一律软删除，可从回收站恢复。
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import Principal, require_admin
from app.schemas.common import ok
from app.schemas.user import UserCreateDTO, UserQueryDTO, UserStatusDTO
from app.service.user_service import UserService

router = APIRouter(prefix="/api/admin/users", tags=["管理端-用户"])


@router.get("", summary="用户列表（不含回收站）")
async def page(
    dto: UserQueryDTO = Depends(),
    db: Session = Depends(get_db),
    _: Principal = Depends(require_admin),
) -> dict:
    return ok(UserService(db).page_query(dto).model_dump())


@router.get("/recycle", summary="回收站列表")
async def recycle(
    dto: UserQueryDTO = Depends(),
    db: Session = Depends(get_db),
    _: Principal = Depends(require_admin),
) -> dict:
    return ok(UserService(db).page_recycle(dto).model_dump())


@router.post("", summary="添加用户（直接指定 SSO uid）")
async def create(
    dto: UserCreateDTO,
    db: Session = Depends(get_db),
    _: Principal = Depends(require_admin),
) -> dict:
    return ok(UserService(db).create_user(dto).model_dump())


@router.put("/{user_id}/status", summary="启用 / 禁用")
async def update_status(
    user_id: int,
    body: UserStatusDTO,
    db: Session = Depends(get_db),
    _: Principal = Depends(require_admin),
) -> dict:
    return ok(UserService(db).update_status(user_id, body.status).model_dump())


@router.delete("/{user_id}", summary="软删除（移入回收站）")
async def delete(
    user_id: int,
    db: Session = Depends(get_db),
    _: Principal = Depends(require_admin),
) -> dict:
    UserService(db).delete_user(user_id)
    return ok()


@router.post("/{user_id}/restore", summary="从回收站恢复")
async def restore(
    user_id: int,
    db: Session = Depends(get_db),
    _: Principal = Depends(require_admin),
) -> dict:
    return ok(UserService(db).restore(user_id).model_dump())


@router.delete("/{user_id}/purge", summary="彻底删除")
async def purge(
    user_id: int,
    db: Session = Depends(get_db),
    _: Principal = Depends(require_admin),
) -> dict:
    UserService(db).purge(user_id)
    return ok()
