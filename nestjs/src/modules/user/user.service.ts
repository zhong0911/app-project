/**
 * 用户业务层（对标 Spring Boot 的 service/impl/UserServiceImpl）。
 */
import { Injectable } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception';
import { pageResult, PageResult } from '../../common/result/result';
import { UserCreateDto, UserQueryDto, UserUpdateDto } from './dto/user.dto';
import { User } from './user.entity';
import { UserRepository } from './user.repository';
import { toUserVO, UserVO } from './vo/user.vo';

const ALLOWED_ROLES = ['ADMIN', 'USER'];

@Injectable()
export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async createUser(dto: UserCreateDto): Promise<UserVO> {
    const exists = await this.repo.findByUidIncludingDeleted(dto.uid);
    if (exists) {
      if (exists.deleted === 1) throw BusinessException.conflict(`该 uid 已在回收站，请先恢复: ${dto.uid}`);
      throw BusinessException.conflict(`SSO 用户已存在: ${dto.uid}`);
    }
    return toUserVO(await this.repo.insert(dto.uid))!;
  }

  async updateUser(dto: UserUpdateDto): Promise<UserVO> {
    const user = await this.repo.findById(dto.id);
    if (!user) throw BusinessException.notFound(`用户不存在: ${dto.id}`);
    const role = dto.role.toUpperCase();
    if (!ALLOWED_ROLES.includes(role)) {
      throw BusinessException.badRequest(`角色不合法，仅支持 ADMIN / USER: ${dto.role}`);
    }
    return toUserVO(await this.repo.updateRole(dto.id, role))!;
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.repo.findById(id);
    if (!user) throw BusinessException.notFound(`用户不存在: ${id}`);
    await this.repo.softDelete(id);
  }

  async getUserById(id: number): Promise<UserVO> {
    const user = await this.repo.findById(id);
    if (!user) throw BusinessException.notFound(`用户不存在: ${id}`);
    return toUserVO(user)!;
  }

  async pageQuery(dto: UserQueryDto): Promise<PageResult<UserVO>> {
    const { total, records } = await this.repo.page({ ...dto, deleted: 0 });
    return pageResult(dto.pageNum, dto.pageSize, total, records.map((u) => toUserVO(u)!));
  }

  async pageRecycle(dto: UserQueryDto): Promise<PageResult<UserVO>> {
    const { total, records } = await this.repo.page({ ...dto, role: undefined, deleted: 1 });
    return pageResult(dto.pageNum, dto.pageSize, total, records.map((u) => toUserVO(u)!));
  }

  async updateStatus(id: number, status: number): Promise<UserVO> {
    if (![0, 1].includes(status)) throw BusinessException.badRequest('状态仅支持 0-禁用 / 1-启用');
    const user = await this.repo.findById(id, true);
    if (!user) throw BusinessException.notFound(`用户不存在: ${id}`);
    return toUserVO(await this.repo.updateStatus(id, status))!;
  }

  async restore(id: number): Promise<UserVO> {
    const user = await this.repo.findById(id, true);
    if (!user || user.deleted !== 1) throw BusinessException.notFound(`回收站中不存在该用户: ${id}`);
    return toUserVO(await this.repo.restore(id))!;
  }

  async purge(id: number): Promise<void> {
    const user = await this.repo.findById(id, true);
    if (!user || user.deleted !== 1) throw BusinessException.notFound(`回收站中不存在该用户: ${id}`);
    await this.repo.purge(id);
  }

  getByUid(uid: string): Promise<User | null> {
    return uid ? this.repo.findByUid(uid) : Promise.resolve(null);
  }

  /** 新登录用户默认注册为 USER（并发下靠唯一键兜底） */
  async getOrCreateDefaultUser(uid: string): Promise<User | null> {
    if (!uid) return null;
    const existing = (await this.repo.findByUid(uid)) ?? (await this.repo.findByUidIncludingDeleted(uid));
    if (existing) return existing;
    try {
      return await this.repo.insert(uid);
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') return this.repo.findByUidIncludingDeleted(uid);
      throw error;
    }
  }
}
