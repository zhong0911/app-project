"""业务异常 + 全局异常处理（对标 Spring Boot 的 BusinessException / GlobalExceptionHandler）。"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.common.result_code import RESULT_MESSAGE, ResultCode
from app.schemas.common import fail


class BusinessException(Exception):
    """业务异常：业务层主动抛出，由全局处理器转成统一响应。"""

    def __init__(self, code: int = ResultCode.BUSINESS_ERROR, message: str | None = None):
        self.code = int(code)
        self.message = message or RESULT_MESSAGE.get(ResultCode(self.code), "业务处理失败")
        super().__init__(self.message)


def _json(code: int, message: str) -> JSONResponse:
    # 统一响应体固定五字段，HTTP 状态码与业务码分开（与 Spring 模板一致：HTTP 200 + code）
    return JSONResponse(status_code=200, content=fail(code, message))


def register_exception_handlers(app: FastAPI) -> None:
    """注册全部异常处理器（等价 @RestControllerAdvice）。"""

    @app.exception_handler(BusinessException)
    async def handle_business(_: Request, exc: BusinessException) -> JSONResponse:
        return _json(exc.code, exc.message)

    @app.exception_handler(RequestValidationError)
    async def handle_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        # 把 pydantic 校验错误拼成中文提示，与 Spring 的 MethodArgumentNotValidException 对齐
        messages = []
        for err in exc.errors():
            loc = ".".join(str(p) for p in err.get("loc", []) if p not in ("body", "query", "path"))
            messages.append(f"{loc}: {err.get('msg')}" if loc else str(err.get("msg")))
        return _json(int(ResultCode.BAD_REQUEST), "；".join(messages) or "请求参数错误")

    @app.exception_handler(StarletteHTTPException)
    async def handle_http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = int(exc.status_code)
        message = RESULT_MESSAGE.get(ResultCode(code), str(exc.detail)) if code in ResultCode._value2member_map_ else str(exc.detail)
        return _json(code, message)

    @app.exception_handler(Exception)
    async def handle_unknown(_: Request, __: Exception) -> JSONResponse:
        return _json(int(ResultCode.INTERNAL_ERROR), RESULT_MESSAGE[ResultCode.INTERNAL_ERROR])
