/**
 * 用户模型（对标 Spring Boot 的 entity/User）。
 *
 * 表 `users` 以 SSO uid 为身份键：
 * - 用户名 / 昵称 / 邮箱由 SSO 提供，本地不维护
 * - 本地只维护角色（ADMIN / USER）、启停状态、软删除
 */
export const TABLE = 'users';

export const ROLES = ['ADMIN', 'USER'];

/** 数据库行 → 实体（下划线转驼峰） */
export function toEntity(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    uid: row.uid,
    role: row.role,
    status: Number(row.status),
    deleted: Number(row.deleted),
    version: Number(row.version),
    createTime: row.create_time,
    updateTime: row.update_time,
  };
}

/** 新建实体的默认值（role 由调用方按 SSO_ADMIN_UID 决定，默认普通用户） */
export function createEntity(uid, role = 'USER') {
  return {
    uid,
    role,
    status: 1,
    deleted: 0,
    version: 1,
  };
}
