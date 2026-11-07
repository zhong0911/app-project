"""用户 ORM 实体（对标 Spring Boot 的 entity/User）。

表 `users` 以 SSO uid 为身份键：
- 用户名 / 昵称 / 邮箱由 SSO 提供，本地不维护
- 本地只维护角色（ADMIN / USER）、启停状态、软删除
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    # SSO 用户 uid（= access_token 的 sub），唯一键
    uid: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    # 子应用角色：ADMIN / USER（新用户默认 USER）
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="USER")
    # 启停状态：1-启用，0-禁用
    status: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # 逻辑删除：0-未删除，1-已删除（回收站）
    deleted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # 乐观锁版本号
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    create_time: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    update_time: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
