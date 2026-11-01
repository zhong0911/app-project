"""AntX FastAPI 模板 入口（对标 Spring Boot 模板 springboot）。

运行：
    pip install -r requirements.txt
    uvicorn main:app --reload --host 0.0.0.0 --port 8080
"""
from fastapi import FastAPI

from app.exception_handlers import register_exception_handlers
from app.routers import auth, user

app = FastAPI(
    title="AntX FastAPI Template",
    description="对标 Spring Boot 模板的统一响应 Result / PageResult、ResultCode 分段、全局异常处理、OAuth2 客户端",
    version="1.0.0",
)

# 注册全局异常处理器（业务 / 参数校验 / HTTP / 兜底）
register_exception_handlers(app)

# 注册 RESTful 路由
app.include_router(user.router)

# 注册 OAuth2 客户端路由（/oauth2/{provider}/authorize、/oauth2/{provider}/callback）
# 与单点退出接口（POST /api/auth/logout）
app.include_router(auth.router)
app.include_router(auth.auth_api_router)


@app.get("/api/health")
def health() -> dict:
    """健康检查。"""
    from app.result import Result
    return Result.success_with({"status": "up", "service": "fastapi"})
