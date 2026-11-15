"""角色业务层（对标 Spring Boot 的 service/impl/RoleServiceImpl）。

规则与 Spring Boot 一致：
- 编码统一去空格转大写，只允许字母开头、字母/数字/下划线，长度 2-32；
- 内置角色（built_in=1）不可删除、不可改编码；
- 仍被用户引用的角色不允许删除，避免出现「角色编码在字典里查不到」的用户。
"""

from sqlalchemy.orm import Session

from app.common.result_code import ResultCode
from app.core.exceptions import BusinessException
from app.models.role import Role
from app.repository.role_repo import RoleRepository
from app.schemas.role import RoleDTO, RoleVO


def to_vo(role: Role) -> RoleVO:
    """Entity → VO（隐藏内部字段）。"""

    return RoleVO(
        id=int(role.id),
        code=role.code,
        name=role.name,
        description=role.description,
        builtIn=int(role.built_in),
        status=int(role.status),
        sort=int(role.sort),
        createTime=role.create_time,
        updateTime=role.update_time,
    )


def normalize_code(code: str) -> str:
    """角色编码归一化：去空格并转大写。"""

    return (code or "").strip().upper()


class RoleService:
    def __init__(self, db: Session) -> None:
        self.repo = RoleRepository(db)

    def list_roles(self, include_disabled: bool = False) -> list[RoleVO]:
        return [to_vo(role) for role in self.repo.list(include_disabled)]

    def create_role(self, dto: RoleDTO) -> RoleVO:
        code = normalize_code(dto.code)
        if self.repo.get_by_code(code) is not None:
            raise BusinessException(ResultCode.DATA_CONFLICT, f"角色编码已存在: {code}")

        role = Role(
            code=code,
            name=dto.name.strip(),
            description=(dto.description or "").strip() or None,
            built_in=0,
            status=dto.status if dto.status is not None else 1,
            sort=dto.sort if dto.sort is not None else 0,
        )
        return to_vo(self.repo.create(role))

    def update_role(self, role_id: int, dto: RoleDTO) -> RoleVO:
        role = self.repo.get_by_id(role_id)
        if role is None:
            raise BusinessException(ResultCode.NOT_FOUND, f"角色不存在: {role_id}")

        code = normalize_code(dto.code)

        # 内置角色编码固定，避免改坏已有用户的角色关联
        if int(role.built_in) == 1 and role.code != code:
            raise BusinessException(ResultCode.BAD_REQUEST, f"内置角色编码不可修改: {role.code}")
        if role.code != code and self.repo.get_by_code(code) is not None:
            raise BusinessException(ResultCode.DATA_CONFLICT, f"角色编码已存在: {code}")

        role.code = code
        role.name = dto.name.strip()
        if dto.description is not None:
            role.description = dto.description.strip() or None
        if dto.status is not None:
            role.status = dto.status
        if dto.sort is not None:
            role.sort = dto.sort
        return to_vo(self.repo.update(role))

    def delete_role(self, role_id: int) -> None:
        role = self.repo.get_by_id(role_id)
        if role is None:
            raise BusinessException(ResultCode.NOT_FOUND, f"角色不存在: {role_id}")
        if int(role.built_in) == 1:
            raise BusinessException(ResultCode.BAD_REQUEST, f"内置角色不可删除: {role.code}")

        used = self.repo.count_users_by_code(role.code)
        if used > 0:
            raise BusinessException(
                ResultCode.DATA_CONFLICT,
                f"仍有 {used} 个用户使用该角色，请先调整用户角色: {role.code}",
            )

        self.repo.delete(role)
