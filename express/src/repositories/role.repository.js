/**
 * 角色仓储层（对标 Spring Boot 的 mapper/RoleMapper）：只做数据库 CRUD。
 */
import { query } from '../config/database.js';
import { TABLE, toEntity } from '../models/role.model.js';
import { TABLE as USER_TABLE } from '../models/user.model.js';

export const roleRepository = {
  /** 角色列表：默认只给启用角色，includeDisabled=true 时返回全部（按 sort、id 升序） */
  async list({ includeDisabled = false } = {}) {
    const rows = await query(
      `SELECT * FROM ${TABLE} ${includeDisabled ? '' : 'WHERE status = 1'} ORDER BY sort ASC, id ASC`,
    );
    return rows.map(toEntity);
  },

  async findById(id) {
    const rows = await query(`SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
    return toEntity(rows[0]);
  },

  async findByCode(code) {
    const rows = await query(`SELECT * FROM ${TABLE} WHERE code = ? LIMIT 1`, [code]);
    return toEntity(rows[0]);
  },

  async insert(entity) {
    const result = await query(
      `INSERT INTO ${TABLE} (code, name, description, built_in, status, sort) VALUES (?, ?, ?, ?, ?, ?)`,
      [entity.code, entity.name, entity.description, entity.builtIn, entity.status, entity.sort],
    );
    return this.findById(result.insertId);
  },

  async update(entity) {
    await query(
      `UPDATE ${TABLE} SET code = ?, name = ?, description = ?, status = ?, sort = ? WHERE id = ?`,
      [entity.code, entity.name, entity.description, entity.status, entity.sort, entity.id],
    );
    return this.findById(entity.id);
  },

  async remove(id) {
    await query(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
  },

  /** 仍在引用该角色编码的用户数（>0 时不允许删除角色） */
  async countUsersByCode(code) {
    const [row] = await query(`SELECT COUNT(*) AS total FROM ${USER_TABLE} WHERE role = ?`, [code]);
    return Number(row.total);
  },
};
