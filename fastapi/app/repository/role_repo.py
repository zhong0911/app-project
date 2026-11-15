"""角色仓储层（对标 Spring Boot 的 mapper/RoleMapper，负责纯数据库 CRUD）。"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.role import Role
from app.models.user import User


class RoleRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ---- 查询 ----
    def list(self, include_disabled: bool = False) -> list[Role]:
        """角色列表：默认只给启用角色，include_disabled=True 时返回全部（按 sort、id 升序）。"""

        stmt = select(Role)
        if not include_disabled:
            stmt = stmt.where(Role.status == 1)
        return list(self.db.scalars(stmt.order_by(Role.sort.asc(), Role.id.asc())).all())

    def get_by_id(self, role_id: int) -> Role | None:
        return self.db.scalar(select(Role).where(Role.id == role_id))

    def get_by_code(self, code: str) -> Role | None:
        return self.db.scalar(select(Role).where(Role.code == code))

    # ---- 写入 ----
    def create(self, role: Role) -> Role:
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        return role

    def update(self, role: Role) -> Role:
        self.db.commit()
        self.db.refresh(role)
        return role

    def delete(self, role: Role) -> None:
        self.db.delete(role)
        self.db.commit()

    def count_users_by_code(self, code: str) -> int:
        """仍在引用该角色编码的用户数（>0 时不允许删除角色）。"""

        return int(self.db.scalar(select(func.count(User.id)).where(User.role == code)) or 0)
