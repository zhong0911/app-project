/**
 * 角色业务层（对标 Spring Boot 的 service/impl/RoleServiceImpl）。
 *
 * 规则与 Spring Boot 一致：
 * - 编码统一去空格转大写，只允许字母开头、字母/数字/下划线，长度 2-32；
 * - 内置角色（builtIn=1）不可删除、不可改编码；
 * - 仍被用户引用的角色不允许删除，避免出现「角色编码在字典里查不到」的用户。
 */
import { Injectable } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { RoleDto } from './dto/role.dto';
import { RoleRepository } from './role.repository';
import { RoleVO, toRoleVO } from './vo/role.vo';

@Injectable()
export class RoleService {
  constructor(private readonly repo: RoleRepository) {}

  async listRoles(includeDisabled = false): Promise<RoleVO[]> {
    const roles = await this.repo.list(includeDisabled);
    return roles.map((role) => toRoleVO(role)!);
  }

  async createRole(dto: RoleDto): Promise<RoleVO> {
    const code = dto.code.trim().toUpperCase();
    if (await this.repo.findByCode(code)) {
      throw BusinessException.conflict(`角色编码已存在: ${code}`);
    }

    const role = await this.repo.insert({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      builtIn: 0,
      status: dto.status ?? 1,
      sort: dto.sort ?? 0,
    });
    return toRoleVO(role)!;
  }

  async updateRole(id: number, dto: RoleDto): Promise<RoleVO> {
    const role = await this.repo.findById(id);
    if (!role) throw BusinessException.notFound(`角色不存在: ${id}`);

    const code = dto.code.trim().toUpperCase();

    // 内置角色编码固定，避免改坏已有用户的角色关联
    if (Number(role.builtIn) === 1 && role.code !== code) {
      throw BusinessException.badRequest(`内置角色编码不可修改: ${role.code}`);
    }
    if (role.code !== code && (await this.repo.findByCode(code))) {
      throw BusinessException.conflict(`角色编码已存在: ${code}`);
    }

    const updated = await this.repo.update(id, {
      code,
      name: dto.name.trim(),
      description: dto.description === undefined ? role.description : dto.description.trim() || null,
      status: dto.status ?? Number(role.status),
      sort: dto.sort ?? Number(role.sort),
    });
    return toRoleVO(updated)!;
  }

  async deleteRole(id: number): Promise<void> {
    const role = await this.repo.findById(id);
    if (!role) throw BusinessException.notFound(`角色不存在: ${id}`);
    if (Number(role.builtIn) === 1) {
      throw BusinessException.badRequest(`内置角色不可删除: ${role.code}`);
    }

    const used = await this.repo.countUsersByCode(role.code);
    if (used > 0) {
      throw BusinessException.conflict(
        `仍有 ${used} 个用户使用该角色，请先调整用户角色: ${role.code}`,
      );
    }

    await this.repo.remove(id);
  }
}
