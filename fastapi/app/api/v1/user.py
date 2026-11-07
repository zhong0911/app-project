"""用户接口（对标 Spring Boot 的 controller/UserController）。

全部需要登录（未登录 401）；入参 DTO、出参 VO、JSON body。
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import Principal, require_login
from app.schemas.common import PageResult, ok
from app.schemas.user import UserCreateDTO, UserQueryDTO, UserUpdateDTO, UserVO
from app.service.user_service import UserService

router = APIRouter(prefix="/api/users", tags=["用户"], dependencies=[Depends(require_login)])


@router.post("", summary="创建用户")
async def create(dto: UserCreateDTO, db: Session = Depends(get_db)) -> dict:
    return ok(UserService(db).create_user(dto).model_dump())


@router.put("", summary="更新用户（调整角色）")
async def update(dto: UserUpdateDTO, db: Session = Depends(get_db)) -> dict:
    return ok(UserService(db).update_user(dto).model_dump())


@router.delete("/{user_id}", summary="删除用户（逻辑删除）")
async def delete(user_id: int, db: Session = Depends(get_db)) -> dict:
    UserService(db).delete_user(user_id)
    return ok()


@router.get("/{user_id}", summary="用户详情")
async def detail(user_id: int, db: Session = Depends(get_db)) -> dict:
    return ok(UserService(db).get_user(user_id).model_dump())


@router.get("", summary="分页查询用户")
async def page(
    dto: UserQueryDTO = Depends(),
    db: Session = Depends(get_db),
    _: Principal = Depends(require_login),
) -> dict:
    result: PageResult[UserVO] = UserService(db).page_query(dto)
    return ok(result.model_dump())
