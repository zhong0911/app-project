"""角色 DTO / VO（对标 Spring Boot 的 dto/RoleDTO 与 vo/RoleVO）。

- `RoleDTO`：新增 / 更新入参，负责参数校验
- `RoleVO`：响应出参，隐藏内部字段，出参统一 camelCase
"""

from datetime import datetime

from pydantic import BaseModel, Field

# 角色编码规则（与前端 CODE_PATTERN、Spring Boot RoleDTO 一致）
CODE_PATTERN = r"^[A-Za-z][A-Za-z0-9_]{1,31}$"


class RoleDTO(BaseModel):
    """角色新增 / 更新入参。"""

    code: str = Field(pattern=CODE_PATTERN, description="角色编码（大写，如 ADMIN / AUDITOR）")
    name: str = Field(min_length=1, max_length=64, description="角色名称")
    description: str | None = Field(default=None, max_length=255, description="角色描述")
    status: int | None = Field(default=None, ge=0, le=1, description="1-启用，0-禁用")
    sort: int | None = Field(default=None, description="排序（升序）")


class RoleQueryDTO(BaseModel):
    """角色列表查询入参。"""

    includeDisabled: bool = Field(default=False, description="是否包含禁用角色")


class RoleVO(BaseModel):
    """角色出参。"""

    id: int
    code: str
    name: str
    description: str | None
    builtIn: int
    status: int
    sort: int
    createTime: datetime | None
    updateTime: datetime | None
