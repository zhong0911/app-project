/**
 * BFF 聚合接口（对标 Spring Boot 的 controller/BffController）。
 * GET /api/bff/me —— 一次拿到登录态：SSO 身份 + 本地角色。
 */
import { success } from '../utils/result.js';
import { bffUserVO } from '../vos/user.vo.js';
import { currentUserService } from '../services/current-user.service.js';
import { userService } from '../services/user.service.js';

export async function me(req, res, next) {
  try {
    const principal = req.principal;
    if (!principal?.uid) return res.json(success(bffUserVO({})));

    const uid = principal.uid;
    const payload = {
      authType: principal.authType,
      uid,
      name: principal.name,
      isAdmin: currentUserService.isAdmin(uid),
    };

    // 聚合本地角色 / 启停状态（未注册则无角色）
    const local = await userService.getByUid(uid);
    if (local) {
      payload.localId = local.id;
      payload.role = local.role;
      payload.status = local.status;
    }
    return res.json(success(bffUserVO(payload)));
  } catch (error) {
    next(error);
  }
}
