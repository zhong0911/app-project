"""用户仓储层（MySQL users，对标 Spring Boot UserMapper）。

字段：id / uid / role / status / deleted / version / create_time / update_time。
删除均为软删除（deleted=1 进入回收站）。
"""
from __future__ import annotations

from typing import Any

from .db import connection
from .business_exception import BusinessException
from .result_code import ResultCode

_COLUMNS = "id, uid, role, status, deleted, version, create_time, update_time"


def _to_vo(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {
        "id": row["id"],
        "uid": row["uid"],
        "role": row["role"],
        "status": row["status"],
        "deleted": row["deleted"],
        "createTime": row["create_time"].strftime("%Y-%m-%d %H:%M:%S") if row["create_time"] else None,
        "updateTime": row["update_time"].strftime("%Y-%m-%d %H:%M:%S") if row["update_time"] else None,
    }


def page(page_num: int, page_size: int, uid: str | None, status: int | None,
         deleted: int) -> tuple[int, list[dict[str, Any]]]:
    """分页查询；deleted=0 正常列表，deleted=1 回收站。"""
    wheres = ["deleted = %s"]
    params: list[Any] = [deleted]
    if uid:
        wheres.append("uid = %s")
        params.append(uid)
    if status is not None:
        wheres.append("status = %s")
        params.append(status)
    where_sql = " AND ".join(wheres)

    offset = (max(1, page_num) - 1) * max(1, min(100, page_size))
    with connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) AS total FROM users WHERE {where_sql}", params)
            total = int(cursor.fetchone()["total"])
            cursor.execute(
                f"SELECT {_COLUMNS} FROM users WHERE {where_sql} "
                "ORDER BY create_time DESC, id DESC LIMIT %s, %s",
                [*params, offset, max(1, min(100, page_size))],
            )
            rows = cursor.fetchall()
    return total, [_to_vo(row) for row in rows]


def get_by_uid(uid: str, include_deleted: bool = False) -> dict[str, Any] | None:
    sql = f"SELECT {_COLUMNS} FROM users WHERE uid = %s"
    if not include_deleted:
        sql += " AND deleted = 0"
    with connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql + " LIMIT 1", [uid])
            return _to_vo(cursor.fetchone())


def get_by_id(user_id: int, include_deleted: bool = False) -> dict[str, Any] | None:
    sql = f"SELECT {_COLUMNS} FROM users WHERE id = %s"
    if not include_deleted:
        sql += " AND deleted = 0"
    with connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql + " LIMIT 1", [user_id])
            return _to_vo(cursor.fetchone())


def create(uid: str) -> dict[str, Any]:
    exists = get_by_uid(uid, include_deleted=True)
    if exists is not None:
        if int(exists["deleted"] or 0) == 1:
            raise BusinessException(ResultCode.DATA_CONFLICT, "该 uid 已在回收站，请先恢复")
        raise BusinessException(ResultCode.DATA_CONFLICT, "SSO 用户已存在: " + uid)
    with connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO users (uid, role, status, deleted, version) VALUES (%s, 'USER', 1, 0, 1)",
                [uid],
            )
            user_id = int(cursor.lastrowid)
    return get_by_id(user_id)  # type: ignore[return-value]


def update_status(user_id: int, status: int) -> dict[str, Any]:
    if status not in (0, 1):
        raise BusinessException(ResultCode.BAD_REQUEST, "状态仅支持 0-禁用 / 1-启用")
    if get_by_id(user_id) is None:
        raise BusinessException(ResultCode.NOT_FOUND, "用户不存在")
    with connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE users SET status = %s WHERE id = %s AND deleted = 0", [status, user_id])
    return get_by_id(user_id)  # type: ignore[return-value]


def soft_delete(user_id: int) -> None:
    if get_by_id(user_id) is None:
        raise BusinessException(ResultCode.NOT_FOUND, "用户不存在")
    with connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE users SET deleted = 1 WHERE id = %s AND deleted = 0", [user_id])


def restore(user_id: int) -> dict[str, Any]:
    row = get_by_id(user_id, include_deleted=True)
    if row is None or int(row["deleted"] or 0) != 1:
        raise BusinessException(ResultCode.NOT_FOUND, "回收站中不存在该用户")
    with connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE users SET deleted = 0 WHERE id = %s AND deleted = 1", [user_id])
    return get_by_id(user_id)  # type: ignore[return-value]


def purge(user_id: int) -> None:
    with connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM users WHERE id = %s AND deleted = 1", [user_id])
            affected = cursor.rowcount
    if affected == 0:
        raise BusinessException(ResultCode.NOT_FOUND, "回收站中不存在该用户")
