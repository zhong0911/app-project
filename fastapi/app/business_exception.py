"""业务异常（对标 Spring Boot 模板 BusinessException）。

业务层主动抛出，由全局异常处理器统一捕获并转成统一响应，
避免把异常细节直接暴露给前端。
"""
from __future__ import annotations

from .result_code import ResultCode


class BusinessException(Exception):
    """业务异常，携带错误码。"""

    def __init__(self, code: int | ResultCode, message: str | None = None) -> None:
        if message is None:
            message = ResultCode(code).message
        super().__init__(message)
        self.code = int(code)

    @classmethod
    def of(cls, message: str) -> "BusinessException":
        """业务异常（默认 1000）。"""
        return cls(ResultCode.BUSINESS_ERROR, message)

    @classmethod
    def of_code(cls, code: int | ResultCode) -> "BusinessException":
        """按状态码，使用默认提示语。"""
        return cls(code, ResultCode(code).message)
