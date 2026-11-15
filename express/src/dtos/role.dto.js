/**
 * 角色入参 DTO（对标 Spring Boot 的 dto/RoleDTO）。
 * 只做"字段是否合法"的校验，业务规则放 service。
 */
import { BusinessError } from '../utils/business-error.js';

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

/** 角色编码规则（与前端 CODE_PATTERN、Spring Boot RoleDTO 一致） */
export const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_]{1,31}$/;

export const RoleDTO = {
  validate(body = {}) {
    const code = String(body.code ?? '').trim().toUpperCase();
    if (isBlank(code)) throw BusinessError.badRequest('角色编码不能为空');
    if (!CODE_PATTERN.test(code)) {
      throw BusinessError.badRequest('角色编码只允许字母、数字与下划线，长度 2-32');
    }

    const name = String(body.name ?? '').trim();
    if (isBlank(name)) throw BusinessError.badRequest('角色名称不能为空');
    if (name.length > 64) throw BusinessError.badRequest('角色名称长度不能超过 64');

    let description;
    if (body.description !== undefined) {
      description = String(body.description ?? '').trim();
      if (description.length > 255) throw BusinessError.badRequest('角色描述长度不能超过 255');
      if (description === '') description = undefined;
    }

    let status;
    if (body.status !== undefined && body.status !== null) {
      status = Number(body.status);
      if (![0, 1].includes(status)) throw BusinessError.badRequest('状态仅支持 0-禁用 / 1-启用');
    }

    let sort;
    if (body.sort !== undefined && body.sort !== null) {
      sort = Number(body.sort);
      if (!Number.isInteger(sort)) throw BusinessError.badRequest('排序必须是整数');
    }

    return { code, name, description, status, sort };
  },
};
