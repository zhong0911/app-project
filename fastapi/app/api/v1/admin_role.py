"""管理后台角色字典（对标 Spring Boot 的 controller/RoleController）。

仅管理员可访问；管理员由 `SSO_ADMIN_UID`（默认 1）判定。
角色是子应用本地字典，内置 ADMIN / USER（built_in=1：编码不可改、不可删）。
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import Principal, require_admin
from app.schemas.common import ok
from app.schemas.role import RoleDTO, RoleQueryDTO
from app.service.role_service import RoleService

router = APIRouter(prefix="/api/admin/roles", tags=["管理端-角色"])


@router.get("", summary="角色列表（默认只返回启用角色）")
async def list_roles(
    dto: RoleQueryDTO = Depends(),
    db: Session = Depends(get_db),
    _: Principal = Depends(require_admin),
) -> dict:
    roles = RoleService(db).list_roles(dto.includeDisabled)
    return ok([role.model_dump() for role in roles])


@router.post("", summary="新增角色")
async def create(
    body: RoleDTO,
    db: Session = Depends(get_db),
    _: Principal = Depends(require_admin),
) -> dict:
    return ok(RoleService(db).create_role(body).model_dump())


@router.put("/{role_id}", summary="更新角色（内置角色编码不可改）")
async def update(
    role_id: int,
    body: RoleDTO,
    db: Session = Depends(get_db),
    _: Principal = Depends(require_admin),
) -> dict:
    return ok(RoleService(db).update_role(role_id, body).model_dump())


@router.delete("/{role_id}", summary="删除角色（内置角色、仍被用户使用的角色不可删）")
async def delete(
    role_id: int,
    db: Session = Depends(get_db),
    _: Principal = Depends(require_admin),
) -> dict:
    RoleService(db).delete_role(role_id)
    return ok()
