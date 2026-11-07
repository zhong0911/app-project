"""数据库连接（对标 Spring Boot 的 DataSource + MyBatis-Plus 配置）。

- `engine` / `SessionLocal`：连接池与会话工厂
- `Base`：ORM 基类（对应 JPA 的实体基类）
- `get_db`：FastAPI 依赖注入用的会话（每个请求一个，用完关闭）
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.db_url,
    echo=settings.db_echo,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """所有 ORM 实体的基类（对应 MyBatis-Plus 的实体包约定）。"""


def get_db() -> Generator[Session, None, None]:
    """请求级数据库会话（FastAPI 依赖：`db: Session = Depends(get_db)`）。"""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
