/**
 * 用户出参 VO（对标 Spring Boot 的 vo/UserVO、vo/BffUserVO）。
 * 只暴露前端需要的字段，隐藏实体内部字段。
 */

/** 实体 → VO */
export function userVO(entity) {
  if (!entity) return null;
  const { id, uid, role, status, deleted, createTime, updateTime } = entity;
  return { id, uid, role, status, deleted, createTime, updateTime };
}

/** 分页 VO */
export function userPageVO(page) {
  return {
    pageNum: page.pageNum,
    pageSize: page.pageSize,
    total: page.total,
    pages: page.pages,
    records: page.records.map(userVO),
  };
}

/** BFF 登录态 VO */
export function bffUserVO({ authType, uid, localId, role, isAdmin, status, name }) {
  return { authType, uid, localId, role, isAdmin, status, name };
}
