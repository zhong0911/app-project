/**
 * 用户仓储层（对标 Spring Boot 的 mapper/UserMapper）。
 * 只做数据库 CRUD，所有查询默认过滤 deleted = 0。
 */
import { query } from '../config/database.js';
import { TABLE, toEntity } from '../models/user.model.js';

export const userRepository = {
  async findById(id, { includeDeleted = false } = {}) {
    const rows = await query(
      `SELECT * FROM ${TABLE} WHERE id = ? ${includeDeleted ? '' : 'AND deleted = 0'} LIMIT 1`,
      [id],
    );
    return toEntity(rows[0]);
  },

  async findByUid(uid) {
    const rows = await query(`SELECT * FROM ${TABLE} WHERE uid = ? AND deleted = 0 LIMIT 1`, [uid]);
    return toEntity(rows[0]);
  },

  /** 含回收站记录：创建前查重，避免软删除后重复插入触发唯一键冲突 */
  async findByUidIncludingDeleted(uid) {
    const rows = await query(`SELECT * FROM ${TABLE} WHERE uid = ? LIMIT 1`, [uid]);
    return toEntity(rows[0]);
  },

  async page({ pageNum, pageSize, uid, role, status, deleted = 0 }) {
    const conditions = ['deleted = ?'];
    const params = [deleted];
    if (uid) {
      conditions.push('uid = ?');
      params.push(uid);
    }
    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }
    if (status !== undefined) {
      conditions.push('status = ?');
      params.push(status);
    }

    const where = conditions.join(' AND ');
    const [countRow] = await query(`SELECT COUNT(*) AS total FROM ${TABLE} WHERE ${where}`, params);
    const rows = await query(
      `SELECT * FROM ${TABLE} WHERE ${where} ORDER BY create_time DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (pageNum - 1) * pageSize],
    );
    return { total: Number(countRow.total), records: rows.map(toEntity) };
  },

  async insert(entity) {
    const result = await query(
      `INSERT INTO ${TABLE} (uid, role, status, deleted, version) VALUES (?, ?, ?, ?, ?)`,
      [entity.uid, entity.role, entity.status, entity.deleted, entity.version],
    );
    return this.findById(result.insertId, { includeDeleted: true });
  },

  async updateRole(id, role) {
    await query(`UPDATE ${TABLE} SET role = ?, version = version + 1 WHERE id = ? AND deleted = 0`, [role, id]);
    return this.findById(id, { includeDeleted: true });
  },

  async updateStatus(id, status) {
    await query(`UPDATE ${TABLE} SET status = ? WHERE id = ?`, [status, id]);
    return this.findById(id, { includeDeleted: true });
  },

  async softDelete(id) {
    await query(`UPDATE ${TABLE} SET deleted = 1 WHERE id = ? AND deleted = 0`, [id]);
  },

  async restore(id) {
    await query(`UPDATE ${TABLE} SET deleted = 0 WHERE id = ? AND deleted = 1`, [id]);
    return this.findById(id);
  },

  async purge(id) {
    await query(`DELETE FROM ${TABLE} WHERE id = ? AND deleted = 1`, [id]);
  },
};
