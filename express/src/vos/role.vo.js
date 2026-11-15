/**
 * 角色出参 VO（对标 Spring Boot 的 vo/RoleVO）。
 * 只暴露前端需要的字段，隐藏实体内部字段。
 */
export function roleVO(entity) {
  if (!entity) return null;
  const { id, code, name, description, builtIn, status, sort, createTime, updateTime } = entity;
  return { id, code, name, description, builtIn, status, sort, createTime, updateTime };
}

/** 列表 VO */
export function roleListVO(records) {
  return (records ?? []).map(roleVO);
}
