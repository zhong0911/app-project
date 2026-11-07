"""统一响应体与分页封装（对标 Spring Boot 的 Result / PageResult）。

所有接口（含异常）都返回这五个字段：

```json
{"code": 200, "success": true, "message": "操作成功", "data": {}, "timestamp": 1720000000000}
```
"""

import time
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


def ok(data: Any = None, message: str = "操作成功") -> dict[str, Any]:
    """成功响应。"""

    return {
        "code": 200,
        "success": True,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }


def fail(code: int, message: str) -> dict[str, Any]:
    """失败响应。"""

    return {
        "code": code,
        "success": False,
        "message": message,
        "data": None,
        "timestamp": int(time.time() * 1000),
    }


class PageResult(BaseModel, Generic[T]):
    """分页数据，作为统一响应 data 的载体。"""

    pageNum: int
    pageSize: int
    total: int
    pages: int
    records: list[T]

    @classmethod
    def build(cls, page_num: int, page_size: int, total: int, records: list[T]) -> "PageResult[T]":
        pages = 0 if page_size == 0 else (total + page_size - 1) // page_size
        return cls(
            pageNum=page_num,
            pageSize=page_size,
            total=total,
            pages=pages,
            records=records,
        )
