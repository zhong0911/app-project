/**
 * 当前登录身份 + 管理员判定（对标 Spring Boot 的 service/CurrentUserService）。
 * 管理员 uid 由 SSO_ADMIN_UID 配置（默认 1）。
 */
import { config } from '../config/index.js';
import { BusinessError } from '../utils/business-error.js';
import { userService } from './user.service.js';

export const currentUserService = {
  currentUid(principal) {
    return principal?.uid || null;
  },

  isAdmin(uid) {
    return Boolean(uid) && String(uid) === String(config.sso.adminUid);
  },

  /**
   * 管理接口鉴权：未登录 401，非管理员 403，被禁用 403。
   * @returns {Promise<string>} 当前管理员 uid
   */
  async requireAdmin(principal) {
    const uid = this.currentUid(principal);
    if (!uid) throw BusinessError.unauthorized();
    if (!this.isAdmin(uid)) throw BusinessError.forbidden('仅管理员可访问');
    const local = await userService.getByUid(uid);
    if (local && local.status === 0) throw BusinessError.forbidden('账号已被禁用');
    return uid;
  },
};
