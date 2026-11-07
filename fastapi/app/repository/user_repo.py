"""用户仓储层（对标 Spring Boot 的 mapper/UserMapper，负责纯数据库 CRUD）。

约定：所有查询默认过滤 `deleted = 0`；回收站相关方法显式查 `deleted = 1`。
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ---- 查询 ----
    def get_by_id(self, user_id: int, include_deleted: bool = False) -> User | None:
        stmt = select(User).where(User.id == user_id)
        if not include_deleted:
            stmt = stmt.where(User.deleted == 0)
        return self.db.scalar(stmt)

    def get_by_uid(self, uid: str) -> User | None:
        return self.db.scalar(select(User).where(User.uid == uid, User.deleted == 0))

    def get_by_uid_including_deleted(self, uid: str) -> User | None:
        """含回收站记录：创建前查重，避免软删除后重复插入触发唯一键冲突。"""

        return self.db.scalar(select(User).where(User.uid == uid))

    def page(
        self,
        page_num: int,
        page_size: int,
        uid: str | None = None,
        role: str | None = None,
        status: int | None = None,
        deleted: int = 0,
    ) -> tuple[list[User], int]:
        """分页查询，返回 (记录列表, 总数)。"""

        conditions = [User.deleted == deleted]
        if uid:
            conditions.append(User.uid == uid)
        if role:
            conditions.append(User.role == role)
        if status is not None:
            conditions.append(User.status == status)

        total = self.db.scalar(select(func.count()).select_from(User).where(*conditions)) or 0
        stmt = (
            select(User)
            .where(*conditions)
            .order_by(User.create_time.desc(), User.id.desc())
            .offset((page_num - 1) * page_size)
            .limit(page_size)
        )
        return list(self.db.scalars(stmt)), int(total)

    # ---- 写入 ----
    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User) -> User:
        self.db.commit()
        self.db.refresh(user)
        return user

    def soft_delete(self, user: User) -> None:
        user.deleted = 1
        self.db.commit()

    def restore(self, user: User) -> User:
        user.deleted = 0
        self.db.commit()
        self.db.refresh(user)
        return user

    def purge(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()
