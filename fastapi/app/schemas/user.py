"""用户 DTO / VO（对标 Spring Boot 的 dto/ 与 vo/）。

- `*Create` / `*Update` / `*Query`：请求入参（DTO），只含前端提交字段，负责参数校验
- `UserVO` / `BffUserVO`：响应出参（VO），隐藏 deleted / version 等内部字段
"""

from datetime import datetime

from pydantic import BaseModel, Field


class UserCreateDTO(BaseModel):
    """创建用户入参：以 SSO uid 为身份键。"""

    uid: str = Field(min_length=1, max_length=64, description="SSO 用户 uid（= token 的 sub）")


class UserUpdateDTO(BaseModel):
    """更新用户入参：只允许调整本地角色。"""

    id: int = Field(gt=0)
    role: str = Field(pattern="^(?i)(ADMIN|USER)$", description="ADMIN / USER")


class UserStatusDTO(BaseModel):
    """启停入参。"""

    status: int = Field(ge=0, le=1, description="1-启用，0-禁用")


class UserQueryDTO(BaseModel):
    """分页查询入参。"""

    pageNum: int = Field(default=1, ge=1)
    pageSize: int = Field(default=10, ge=1, le=500)
    uid: str | None = None
    role: str | None = None
    status: int | None = None


class UserVO(BaseModel):
    """用户出参。"""

    id: int
    uid: str
    role: str
    status: int
    deleted: int
    createTime: datetime | None = None
    updateTime: datetime | None = None

    model_config = {"from_attributes": True}


class BffUserVO(BaseModel):
    """BFF 聚合出参：面向前端的登录态视图，不含原始 claims。"""

    authType: str | None = None
    uid: str | None = None
    localId: int | None = None
    role: str | None = None
    isAdmin: bool | None = None
    status: int | None = None
    name: str | None = None
