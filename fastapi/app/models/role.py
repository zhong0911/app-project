"""角色 ORM 实体（对标 Spring Boot 的 entity/Role）。

子应用本地角色字典：内置 ADMIN / USER（built_in=1，不可删除、不可改编码），
可新增自定义角色；users.role 引用这里的 code。
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    # 角色编码（大写，如 ADMIN / USER / AUDITOR），唯一键
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    # 角色名称
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    # 角色描述
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # 内置角色：1-内置（不可删除、不可改编码）
    built_in: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # 状态：1-启用，0-禁用
    status: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # 排序（升序）
    sort: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    create_time: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    update_time: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
