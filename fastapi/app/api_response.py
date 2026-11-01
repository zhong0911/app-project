"""统一响应体（对标 Spring Boot 模板 Result）。

五字段：
{
  "code":      200,
  "success":   true,
  "message":   "操作成功",
  "data":      {...},
  "timestamp": 1720000000000     # 毫秒
}

data 为 null 时省略（对标 @JsonInclude(NON_NULL)）。
"""
from __future__ import annotations

import time
from typing import Any

from .result_code import ResultCode


class ApiResponse:
    """统一响应体（不可变构造器，返回可 JSON 序列化的 dict）。"""

    @staticmethod
    def success() -> dict[str, Any]:
        """成功（无数据）。"""
        return ApiResponse._build(ResultCode.SUCCESS, True, ResultCode.SUCCESS.message, None)

    @staticmethod
    def success_with(data: Any) -> dict[str, Any]:
        """成功（带数据）。"""
        return ApiResponse._build(ResultCode.SUCCESS, True, ResultCode.SUCCESS.message, data)

    @staticmethod
    def success_msg(message: str, data: Any) -> dict[str, Any]:
        """成功（自定义提示 + 数据）。"""
        return ApiResponse._build(ResultCode.SUCCESS, True, message, data)

    @staticmethod
    def error(code: int | ResultCode) -> dict[str, Any]:
        """失败（按状态码，使用默认提示语）。"""
        return ApiResponse._build(code, False, ResultCode(code).message, None)

    @staticmethod
    def error_msg(code: int | ResultCode, message: str) -> dict[str, Any]:
        """失败（按状态码 + 自定义提示）。"""
        return ApiResponse._build(code, False, message, None)

    @staticmethod
    def _build(code: int | ResultCode, success: bool, message: str, data: Any) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "code": int(code),
            "success": success,
            "message": message,
            "timestamp": int(time.time() * 1000),
        }
        if data is not None:  # 对标 @JsonInclude(NON_NULL)
            payload["data"] = data
        return payload
