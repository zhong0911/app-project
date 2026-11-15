/**
 * 角色仓储层（对标 Spring Boot 的 mapper/RoleMapper）：只做数据库 CRUD。
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { User } from '../user/user.entity';

@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(Role) private readonly repo: Repository<Role>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /** 角色列表：默认只给启用角色，includeDisabled=true 时返回全部（按 sort、id 升序） */
  list(includeDisabled = false): Promise<Role[]> {
    return this.repo.find({
      where: includeDisabled ? {} : { status: 1 },
      order: { sort: 'ASC', id: 'ASC' },
    });
  }

  findById(id: number): Promise<Role | null> {
    return this.repo.findOne({ where: { id: String(id) } });
  }

  findByCode(code: string): Promise<Role | null> {
    return this.repo.findOne({ where: { code } });
  }

  insert(entity: Partial<Role>): Promise<Role> {
    return this.repo.save(this.repo.create(entity));
  }

  async update(id: number, entity: Partial<Role>): Promise<Role | null> {
    await this.repo.update({ id: String(id) }, entity);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete({ id: String(id) });
  }

  /** 仍在引用该角色编码的用户数（>0 时不允许删除角色） */
  countUsersByCode(code: string): Promise<number> {
    return this.userRepo.count({ where: { role: code } });
  }
}
