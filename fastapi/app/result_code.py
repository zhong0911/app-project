"""统一响应状态码（对标 Spring Boot 模板 ResultCode）。

分段设计：
  - 0xx ~ 5xx：HTTP 语义段（200 成功 / 400 参数 / 401 未认证 / 403 无权限 / 404 不存在 / 405 方法不支持 / 500 内部错误）
  - 1000+   ：业务码段，按模块递增，避免与 HTTP 状态码混淆
"""
from __future__ import annotations

from enum import IntEnum


# code -> 默认提示语
_MESSAGES = {
    ResultCode.SUCCESS: "操作成功",
    ResultCode.BAD_REQUEST: "请求参数错误",
    ResultCode.UNAUTHORIZED: "未登录或登录已过期",
    ResultCode.FORBIDDEN: "无访问权限",
    ResultCode.NOT_FOUND: "请求资源不存在",
    ResultCode.METHOD_NOT_ALLOWED: "请求方法不支持",
    ResultCode.INTERNAL_ERROR: "服务器内部错误",
    ResultCode.BUSINESS_ERROR: "业务处理失败",
    ResultCode.DATA_CONFLICT: "数据冲突",
    ResultCode.DB_ERROR: "数据库操作失败",
    ResultCode.FILE_ERROR: "文件操作失败",
}


class ResultCode(IntEnum):
    # ---- HTTP 语义段 ----
    SUCCESS = 200
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    METHOD_NOT_ALLOWED = 405
    INTERNAL_ERROR = 500

    # ---- 业务码段（1000 起，按模块递增） ----
    BUSINESS_ERROR = 1000  # 业务异常（默认）
    DATA_CONFLICT = 1001   # 数据冲突（唯一性 / 状态冲突）
    DB_ERROR = 1002        # 数据库操作失败
    FILE_ERROR = 1003      # 文件操作失败

    @property
    def message(self) -> str:
        """默认提示语（对标 Java 枚举的 message 字段）。"""
        return _MESSAGES[self]
