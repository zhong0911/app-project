"""BFF 聚合接口（对标 Spring Boot 的 controller/BffController）。

前端只调 `GET /api/bff/me` 就能拿到登录态：SSO 身份 + 本地角色，不接触原始 claims。
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import Principal, get_principal, is_admin, local_user
from app.schemas.common import ok
from app.schemas.user import BffUserVO

router = APIRouter(prefix="/api/bff", tags=["BFF"])


@router.get("/me", summary="BFF 登录态聚合")
async def me(principal: Principal = Depends(get_principal), db: Session = Depends(get_db)) -> dict:
    vo = BffUserVO()
    if not principal.uid:
        return ok(vo.model_dump(exclude_none=True))

    vo.authType = principal.auth_type
    vo.name = principal.name
    vo.uid = principal.uid
    vo.isAdmin = is_admin(principal)

    # 聚合本地角色 / 启停状态（未注册则无角色）
    user = local_user(principal, db)
    if user is not None:
        vo.localId = user.id
        vo.role = user.role
        vo.status = user.status

    return ok(vo.model_dump(exclude_none=True))
