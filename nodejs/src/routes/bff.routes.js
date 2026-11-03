import { Router } from 'express';
import { Result } from '../result.js';
import { ResultCode } from '../result-code.js';
import { BusinessException } from '../business-exception.js';
import { currentUid, isAdmin } from '../security.js';
import { getByUid } from '../user-repo.js';

/**
 * BFF 聚合接口（对标 Spring Boot BffController）。
 *
 *   GET /api/bff/me：当前 SSO 身份 + 本地角色 + 是否管理员 + 启停状态；未登录返回 401。
 */
export const bffRouter = Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

bffRouter.get('/me', asyncHandler(async (req, res) => {
  const uid = currentUid(req);
  if (!uid) {
    throw new BusinessException(ResultCode.UNAUTHORIZED);
  }
  const local = await getByUid(uid);
  res.json(Result.successWith({
    authType: 'sso',
    uid,
    name: uid,
    role: local ? local.role : null,
    isAdmin: isAdmin(uid),
    status: local ? local.status : null,
    localId: local ? local.id : null,
  }));
}));
