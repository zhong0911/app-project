"""用户接口（RESTful 示例，对标 Spring Boot UserController）。

统一返回 Result 五字段；分页返回 PageResult。
此处用内存字典模拟数据源，接入数据库时替换为仓储层即可。
"""
from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, Path, Query

from ..result import Result
from ..page_result import PageResult
from ..business_exception import BusinessException
from ..result_code import ResultCode

router = APIRouter(prefix="/api/users", tags=["用户"])


class UserCreate(BaseModel):
    """创建用户入参（对标 UserCreateDTO）。"""
    uid: str = Field(..., description="SSO 用户 uid")


class UserUpdate(BaseModel):
    """更新用户入参（对标 UserUpdateDTO）。"""
    id: int = Field(..., description="用户 id")
    role: str | None = Field(default=None, description="角色 ADMIN/USER")


# ---- 内存用户表（仅示例） ----
_users: dict[int, dict] = {
    1: {"id": 1, "uid": "1", "role": "ADMIN", "createTime": "2026-11-01 10:00:00"},
    2: {"id": 2, "uid": "2", "role": "USER", "createTime": "2026-11-01 10:05:00"},
}
_seq: int = 2


@router.post("")
def create_user(body: UserCreate) -> dict:
    """创建用户（POST，对标 @PostMapping）。"""
    global _seq
    uid = body.uid
    if any(u["uid"] == uid for u in _users.values()):
        raise BusinessException(ResultCode.DATA_CONFLICT, "uid 已存在")
    _seq += 1
    _users[_seq] = {"id": _seq, "uid": uid, "role": "USER", "createTime": "2026-11-01 12:00:00"}
    return Result.success_with(_users[_seq])


@router.put("")
def update_user(body: UserUpdate) -> dict:
    """更新用户（PUT，对标 @PutMapping）。"""
    user = _users.get(body.id)
    if user is None:
        raise BusinessException(ResultCode.NOT_FOUND, "用户不存在")
    if body.role is not None:
        user["role"] = body.role
    return Result.success_with(user)


@router.delete("/{user_id}")
def delete_user(user_id: int = Path(..., description="用户 id")) -> dict:
    """删除用户（DELETE，对标 @DeleteMapping）。"""
    if user_id not in _users:
        raise BusinessException(ResultCode.NOT_FOUND, "用户不存在")
    del _users[user_id]
    return Result.success()


@router.get("/{user_id}")
def detail_user(user_id: int = Path(..., description="用户 id")) -> dict:
    """查询用户详情（GET，对标 @GetMapping("/{id}")）。"""
    user = _users.get(user_id)
    if user is None:
        raise BusinessException(ResultCode.NOT_FOUND, "用户不存在")
    return Result.success_with(user)


@router.get("")
def page_user(
    page_num: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=10, ge=1, le=100, description="每页条数"),
) -> dict:
    """分页查询用户列表（GET，对标 @GetMapping 分页）。"""
    all_users = list(_users.values())
    total = len(all_users)
    offset = (page_num - 1) * page_size
    records = all_users[offset: offset + page_size]
    return Result.success_with(PageResult(page_num, page_size, total, records).to_dict())
