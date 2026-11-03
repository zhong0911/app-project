"""MySQL 连接（对标 Spring Boot 模板的 DataSource 配置）。

通过环境变量配置，与 springboot 模板保持一致：
  DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

import pymysql
from pymysql.cursors import DictCursor


def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default)


@contextmanager
def connection() -> Iterator[pymysql.connections.Connection]:
    """获取一个 MySQL 连接（自动提交，请求结束自动关闭）。"""
    conn = pymysql.connect(
        host=_env("DB_HOST", "127.0.0.1"),
        port=int(_env("DB_PORT", "3306")),
        user=_env("DB_USER", "root"),
        password=_env("DB_PASSWORD", ""),
        database=_env("DB_NAME", "antx_template"),
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
    )
    try:
        yield conn
    finally:
        conn.close()
