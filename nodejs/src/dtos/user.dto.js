/**
 * 用户入参 DTO（对标 Spring Boot 的 dto/UserCreateDTO / UserUpdateDTO / UserQueryDTO）。
 * 只做"字段是否合法"的校验，业务规则放 service。
 */
import { BusinessError } from '../utils/business-error.js';
import { ROLES } from '../models/user.model.js';

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

export const UserCreateDTO = {
  /** @param {{uid?:string}} body */
  validate(body = {}) {
    if (isBlank(body.uid)) throw BusinessError.badRequest('SSO 用户 uid 不能为空');
    if (String(body.uid).length > 64) throw BusinessError.badRequest('uid 长度不能超过 64 个字符');
    return { uid: String(body.uid).trim() };
  },
};

export const UserUpdateDTO = {
  validate(body = {}) {
    const id = Number(body.id);
    if (!id) throw BusinessError.badRequest('用户 ID 不能为空');
    if (isBlank(body.role)) throw BusinessError.badRequest('角色不能为空');
    if (!ROLES.includes(String(body.role).toUpperCase())) {
      throw BusinessError.badRequest(`角色不合法，仅支持 ADMIN / USER: ${body.role}`);
    }
    return { id, role: String(body.role).toUpperCase() };
  },
};

export const UserStatusDTO = {
  validate(body = {}) {
    const status = Number(body.status);
    if (![0, 1].includes(status)) throw BusinessError.badRequest('状态仅支持 0-禁用 / 1-启用');
    return { status };
  },
};

export const UserQueryDTO = {
  validate(query = {}) {
    const pageNum = Math.max(1, Number(query.pageNum) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(query.pageSize) || 10));
    return {
      pageNum,
      pageSize,
      uid: isBlank(query.uid) ? undefined : String(query.uid).trim(),
      role: isBlank(query.role) ? undefined : String(query.role).trim().toUpperCase(),
      status: isBlank(query.status) ? undefined : Number(query.status),
    };
  },
};
