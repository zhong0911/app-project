"""角色示例接口（对标 Spring Boot 的 controller/SecurityDemoController）。

演示"子应用自治授权"：SSO 只认证，角色由本地表 / 管理员 uid 判定。
"""

from fastapi import APIRouter, Depends

from app.core.security import Principal, require_admin, require_login
from app.schemas.common import ok

router = APIRouter(prefix="/api/demo", tags=["权限示例"])


@router.get("/admin", summary="仅管理员可访问")
async def admin_only(principal: Principal = Depends(require_admin)) -> dict:
    return ok(f"你好，管理员 {principal.name}")


@router.get("/user", summary="已登录用户可访问")
async def any_login_user(principal: Principal = Depends(require_login)) -> dict:
    return ok(f"你好，{principal.name}")
