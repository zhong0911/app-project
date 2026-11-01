"""分页数据封装（对标 Spring Boot 模板 PageResult），作为 ApiResponse.data 的载体。

{
  "pageNum":  1,
  "pageSize": 10,
  "total":    42,
  "pages":    5,
  "records":  [ ... ]
}
"""
from __future__ import annotations

import math
from typing import Any, Generic, TypeVar

T = TypeVar("T")


class PaginatedData(Generic[T]):
    """分页封装，字段固定为 pageNum / pageSize / total / pages / records。"""

    def __init__(self, page_num: int, page_size: int, total: int, records: list[T]) -> None:
        self.page_num = max(1, page_num)
        self.page_size = max(1, min(100, page_size))
        self.total = total
        # 总页数：向上取整；pageSize 为 0 时视为 0 页
        self.pages = 0 if self.page_size == 0 else math.ceil(self.total / self.page_size)
        self.records = records or []

    def to_dict(self) -> dict[str, Any]:
        return {
            "pageNum": self.page_num,
            "pageSize": self.page_size,
            "total": self.total,
            "pages": self.pages,
            "records": self.records,
        }
