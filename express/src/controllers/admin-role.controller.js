/**
 * 管理后台角色字典（对标 Spring Boot 的 controller/RoleController）。
 * 仅管理员可访问（requireAdmin 中间件已校验）。
 */
import { success } from '../utils/result.js';
import { roleService } from '../services/role.service.js';
import { RoleDTO } from '../dtos/role.dto.js';

export async function list(req, res, next) {
  try {
    const includeDisabled = String(req.query.includeDisabled ?? 'false').toLowerCase() === 'true';
    res.json(success(await roleService.listRoles({ includeDisabled })));
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    res.json(success(await roleService.createRole(RoleDTO.validate(req.body))));
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    res.json(success(await roleService.updateRole(Number(req.params.id), RoleDTO.validate(req.body))));
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await roleService.deleteRole(Number(req.params.id));
    res.json(success());
  } catch (error) {
    next(error);
  }
}
