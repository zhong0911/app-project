"""应用入口（对标 Spring Boot 的 TemplateApplication）。

职责只有三件事：装配中间件、注册路由、注册全局异常处理。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api import sso
from app.api.v1 import admin_role, admin_user, auth, bff, demo, user
from app.core.config import settings
from app.core.database import Base, engine
from app.core.exceptions import register_exception_handlers

app = FastAPI(
    title="AntX FastAPI 后端模板",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

# ---- 中间件 ----
# 会话：SSO 的 access_token / refresh_token 存服务端会话，前端只拿 Cookie
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie=settings.session_cookie_name,
    max_age=settings.session_max_age,
    same_site="lax",
    https_only=False,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- 全局异常（统一五字段响应） ----
register_exception_handlers(app)

# ---- 路由 ----
app.include_router(sso.router)        # /sso/authorize、/sso/callback（公开）
app.include_router(auth.router)       # /api/auth/me、/api/auth/logout
app.include_router(bff.router)        # /api/bff/me
app.include_router(user.router)       # /api/users
app.include_router(admin_user.router) # /api/admin/users
app.include_router(admin_role.router) # /api/admin/roles
app.include_router(demo.router)       # /api/demo/*


@app.get("/health", tags=["健康检查"])
async def health() -> dict:
    return {"status": "UP"}


@app.on_event("startup")
def on_startup() -> None:
    """开发期自动建表；生产请执行 sql/init.sql 或走 Alembic 迁移。"""

    Base.metadata.create_all(bind=engine)
