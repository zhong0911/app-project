/**
 * 用户业务层（对标 Spring Boot 的 service/impl/UserServiceImpl）。
 * 业务校验 + DTO → Entity → VO 转换，不碰 HTTP。
 */
import { userRepository } from '../repositories/user.repository.js';
import { BusinessError } from '../utils/business-error.js';
import { pageResult } from '../utils/result.js';
import { createEntity, ROLES } from '../models/user.model.js';
import { userPageVO, userVO } from '../vos/user.vo.js';

export const userService = {
  async createUser(dto) {
    const exists = await userRepository.findByUidIncludingDeleted(dto.uid);
    if (exists) {
      if (exists.deleted === 1) {
        throw BusinessError.conflict(`该 uid 已在回收站，请先恢复: ${dto.uid}`);
      }
      throw BusinessError.conflict(`SSO 用户已存在: ${dto.uid}`);
    }
    const entity = await userRepository.insert(createEntity(dto.uid));
    return userVO(entity);
  },

  async updateUser(dto) {
    const user = await userRepository.findById(dto.id);
    if (!user) throw BusinessError.notFound(`用户不存在: ${dto.id}`);
    if (!ROLES.includes(dto.role)) {
      throw BusinessError.badRequest(`角色不合法，仅支持 ADMIN / USER: ${dto.role}`);
    }
    return userVO(await userRepository.updateRole(dto.id, dto.role));
  },

  async deleteUser(id) {
    const user = await userRepository.findById(id);
    if (!user) throw BusinessError.notFound(`用户不存在: ${id}`);
    await userRepository.softDelete(id);
  },

  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) throw BusinessError.notFound(`用户不存在: ${id}`);
    return userVO(user);
  },

  async pageQuery(dto) {
    const page = await userRepository.page({ ...dto, deleted: 0 });
    return userPageVO(pageResult({ ...dto, ...page }));
  },

  async pageRecycle(dto) {
    const page = await userRepository.page({ ...dto, deleted: 1, role: undefined });
    return userPageVO(pageResult({ ...dto, ...page }));
  },

  async updateStatus(id, status) {
    const user = await userRepository.findById(id, { includeDeleted: true });
    if (!user) throw BusinessError.notFound(`用户不存在: ${id}`);
    return userVO(await userRepository.updateStatus(id, status));
  },

  async restore(id) {
    const user = await userRepository.findById(id, { includeDeleted: true });
    if (!user || user.deleted !== 1) throw BusinessError.notFound(`回收站中不存在该用户: ${id}`);
    return userVO(await userRepository.restore(id));
  },

  async purge(id) {
    const user = await userRepository.findById(id, { includeDeleted: true });
    if (!user || user.deleted !== 1) throw BusinessError.notFound(`回收站中不存在该用户: ${id}`);
    await userRepository.purge(id);
  },

  async getByUid(uid) {
    return uid ? userRepository.findByUid(uid) : null;
  },

  /** 新登录用户默认注册为 USER（并发下靠唯一键兜底） */
  async getOrCreateDefaultUser(uid) {
    if (!uid) return null;
    const existing = (await userRepository.findByUid(uid)) || (await userRepository.findByUidIncludingDeleted(uid));
    if (existing) return existing;
    try {
      return await userRepository.insert(createEntity(uid));
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return userRepository.findByUidIncludingDeleted(uid);
      throw error;
    }
  },
};
