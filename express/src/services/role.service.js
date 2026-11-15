/**
 * 角色业务层（对标 Spring Boot 的 service/impl/RoleServiceImpl）。
 *
 * 规则与 Spring Boot 一致：
 * - 编码统一去空格转大写，只允许字母开头、字母/数字/下划线，长度 2-32；
 * - 内置角色（builtIn=1）不可删除、不可改编码；
 * - 仍被用户引用的角色不允许删除，避免出现「角色编码在字典里查不到」的用户。
 */
import { roleRepository } from '../repositories/role.repository.js';
import { BusinessError } from '../utils/business-error.js';
import { roleListVO, roleVO } from '../vos/role.vo.js';

export const roleService = {
  async listRoles({ includeDisabled = false } = {}) {
    return roleListVO(await roleRepository.list({ includeDisabled }));
  },

  async createRole(dto) {
    if (await roleRepository.findByCode(dto.code)) {
      throw BusinessError.conflict(`角色编码已存在: ${dto.code}`);
    }
    const entity = await roleRepository.insert({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      builtIn: 0,
      status: dto.status ?? 1,
      sort: dto.sort ?? 0,
    });
    return roleVO(entity);
  },

  async updateRole(id, dto) {
    const role = await roleRepository.findById(id);
    if (!role) throw BusinessError.notFound(`角色不存在: ${id}`);

    // 内置角色编码固定，避免改坏已有用户的角色关联
    if (role.builtIn === 1 && role.code !== dto.code) {
      throw BusinessError.badRequest(`内置角色编码不可修改: ${role.code}`);
    }
    if (role.code !== dto.code && (await roleRepository.findByCode(dto.code))) {
      throw BusinessError.conflict(`角色编码已存在: ${dto.code}`);
    }

    const updated = await roleRepository.update({
      id: role.id,
      code: dto.code,
      name: dto.name ?? role.name,
      description: dto.description === undefined ? role.description : dto.description,
      status: dto.status ?? role.status,
      sort: dto.sort ?? role.sort,
    });
    return roleVO(updated);
  },

  async deleteRole(id) {
    const role = await roleRepository.findById(id);
    if (!role) throw BusinessError.notFound(`角色不存在: ${id}`);
    if (role.builtIn === 1) throw BusinessError.badRequest(`内置角色不可删除: ${role.code}`);

    const used = await roleRepository.countUsersByCode(role.code);
    if (used > 0) {
      throw BusinessError.conflict(`仍有 ${used} 个用户使用该角色，请先调整用户角色: ${role.code}`);
    }

    await roleRepository.remove(id);
  },
};
