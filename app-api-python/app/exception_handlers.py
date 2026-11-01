"""全局异常处理器（对标 Spring Boot 模板 GlobalExceptionHandler）。

统一把各类异常转换为 ApiResponse 五字段响应，错误也按同一格式返回：
  - BusinessException            -> 业务 code + message
  - RequestValidationError       -> BAD_REQUEST（参数校验失败）
  - StarletteHTTPException (404)  -> NOT_FOUND
  - 兜底 Exception                -> INTERNAL_ERROR，不暴露异常信息
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .api_response import ApiResponse
from .business_exception import BusinessException
from .result_code import ResultCode

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """注册全局异常处理器到 FastAPI 应用。"""

    @app.exception_handler(BusinessException)
    async def handle_business(request: Request, exc: BusinessException) -> JSONResponse:
        code = exc.code
        # 业务码段：HTTP 状态统一用 200（业务错误由 code 表达）；HTTP 语义段保持对应状态
        http_status = 200 if code >= 1000 else code
        logger.warning("业务异常: code=%s, message=%s", code, exc.args[0] if exc.args else "")
        return JSONResponse(status_code=http_status, content=ApiResponse.error_msg(code, str(exc.args[0] if exc.args else "")))

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = []
        for err in exc.errors():
            loc = ".".join(str(x) for x in err.get("loc", []) if x != "body")
            errors.append(f"{loc}: {err.get('msg', '')}")
        message = "；".join(errors) or "请求参数错误"
        logger.warning("参数校验失败: %s", message)
        return JSONResponse(status_code=200, content=ApiResponse.error_msg(ResultCode.BAD_REQUEST, message))

    @app.exception_handler(StarletteHTTPException)
    async def handle_http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        if exc.status_code == 404:
            return JSONResponse(status_code=404, content=ApiResponse.error(ResultCode.NOT_FOUND))
        # 其它 HTTP 异常：取对应 ResultCode（若存在）否则 500
        try:
            code = ResultCode(exc.status_code)
        except ValueError:
            code = ResultCode.INTERNAL_ERROR
        return JSONResponse(status_code=exc.status_code, content=ApiResponse.error(code))

    @app.exception_handler(Exception)
    async def handle_exception(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("系统异常")
        return JSONResponse(status_code=500, content=ApiResponse.error(ResultCode.INTERNAL_ERROR))
