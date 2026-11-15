/**
 * 角色模型（对标 Spring Boot 的 entity/Role）。
 *
 * 子应用本地角色字典：内置 ADMIN / USER（built_in=1，不可删除、不可改编码），
 * 可新增自定义角色；users.role 引用这里的 code。
 */
export const TABLE = 'roles';

/** 数据库行 → 实体（下划线转驼峰） */
export function toEntity(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    builtIn: Number(row.built_in),
    status: Number(row.status),
    sort: Number(row.sort),
    createTime: row.create_time,
    updateTime: row.update_time,
  };
}

/** 新建角色的默认值（built_in 由 service 固定为 0） */
export function createEntity({ code, name, description = null, status = 1, sort = 0 }) {
  return { code, name, description, builtIn: 0, status, sort };
}
