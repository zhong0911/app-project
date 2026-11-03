import { pool } from './db.js';
import { BusinessException } from './business-exception.js';
import { ResultCode } from './result-code.js';

/**
 * 用户仓储层（MySQL users，对标 Spring Boot UserMapper）。
 *
 * 字段：id / uid / role / status / deleted / version / create_time / update_time。
 * 删除均为软删除（deleted=1 进入回收站）。
 */

const COLUMNS = 'id, uid, role, status, deleted, version, create_time, update_time';

function toVO(row) {
  if (!row) return null;
  return {
    id: row.id,
    uid: row.uid,
    role: row.role,
    status: row.status,
    deleted: row.deleted,
    createTime: formatTime(row.create_time),
    updateTime: formatTime(row.update_time),
  };
}

function formatTime(value) {
  if (!value) return null;
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 分页查询；deleted=0 正常列表，deleted=1 回收站 */
export async function page(pageNum, pageSize, uid, status, deleted) {
  const size = Math.max(1, Math.min(100, Number(pageSize) || 10));
  const offset = (Math.max(1, Number(pageNum) || 1) - 1) * size;
  const wheres = ['deleted = ?'];
  const params = [deleted];
  if (uid) {
    wheres.push('uid = ?');
    params.push(uid);
  }
  if (status !== undefined && status !== null && status !== '') {
    wheres.push('status = ?');
    params.push(Number(status));
  }
  const whereSql = wheres.join(' AND ');

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM users WHERE ${whereSql}`, params);
  const [rows] = await pool.query(
    `SELECT ${COLUMNS} FROM users WHERE ${whereSql} ORDER BY create_time DESC, id DESC LIMIT ?, ?`,
    [...params, offset, size],
  );
  return { total: Number(countRows[0].total), records: rows.map(toVO) };
}

export async function getByUid(uid, includeDeleted = false) {
  let sql = `SELECT ${COLUMNS} FROM users WHERE uid = ?`;
  if (!includeDeleted) sql += ' AND deleted = 0';
  const [rows] = await pool.query(`${sql} LIMIT 1`, [uid]);
  return toVO(rows[0]);
}

export async function getById(id, includeDeleted = false) {
  let sql = `SELECT ${COLUMNS} FROM users WHERE id = ?`;
  if (!includeDeleted) sql += ' AND deleted = 0';
  const [rows] = await pool.query(`${sql} LIMIT 1`, [id]);
  return toVO(rows[0]);
}

export async function create(uid) {
  const exists = await getByUid(uid, true);
  if (exists) {
    if (Number(exists.deleted) === 1) {
      throw new BusinessException(ResultCode.DATA_CONFLICT, '该 uid 已在回收站，请先恢复');
    }
    throw new BusinessException(ResultCode.DATA_CONFLICT, `SSO 用户已存在: ${uid}`);
  }
  const [result] = await pool.query(
    "INSERT INTO users (uid, role, status, deleted, version) VALUES (?, 'USER', 1, 0, 1)",
    [uid],
  );
  return getById(result.insertId);
}

export async function updateStatus(id, status) {
  if (status !== 0 && status !== 1) {
    throw new BusinessException(ResultCode.BAD_REQUEST, '状态仅支持 0-禁用 / 1-启用');
  }
  if (!(await getById(id))) {
    throw new BusinessException(ResultCode.NOT_FOUND, '用户不存在');
  }
  await pool.query('UPDATE users SET status = ? WHERE id = ? AND deleted = 0', [status, id]);
  return getById(id);
}

export async function softDelete(id) {
  if (!(await getById(id))) {
    throw new BusinessException(ResultCode.NOT_FOUND, '用户不存在');
  }
  await pool.query('UPDATE users SET deleted = 1 WHERE id = ? AND deleted = 0', [id]);
}

export async function restore(id) {
  const row = await getById(id, true);
  if (!row || Number(row.deleted) !== 1) {
    throw new BusinessException(ResultCode.NOT_FOUND, '回收站中不存在该用户');
  }
  await pool.query('UPDATE users SET deleted = 0 WHERE id = ? AND deleted = 1', [id]);
  return getById(id);
}

export async function purge(id) {
  const [result] = await pool.query('DELETE FROM users WHERE id = ? AND deleted = 1', [id]);
  if (result.affectedRows === 0) {
    throw new BusinessException(ResultCode.NOT_FOUND, '回收站中不存在该用户');
  }
}
