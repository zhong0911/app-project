import { Router } from 'express';
import { Result } from '../result.js';
import { ResultCode } from '../result-code.js';
import { PageResult } from '../page-result.js';
import { BusinessException } from '../business-exception.js';
import { requireAdmin } from '../security.js';
import * as userRepo from '../user-repo.js';

/**
 * 管理后台用户管理接口（仅管理员可访问，对标 Spring Boot AdminUserController）。
 *
 *   - GET    /api/admin/users               用户列表（不含回收站）
 *   - POST   /api/admin/users               添加用户（指定 SSO uid）
 *   - PUT    /api/admin/users/{id}/status   启用 / 禁用
 *   - DELETE /api/admin/users/{id}          软删除（移入回收站）
 *   - GET    /api/admin/users/recycle       回收站列表
 *   - POST   /api/admin/users/{id}/restore  从回收站恢复
 *   - DELETE /api/admin/users/{id}/purge    彻底删除
 */
export const adminUserRouter = Router();

/** Express 4 异步异常统一交给全局异常中间件 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BusinessException(ResultCode.BAD_REQUEST, '用户 id 不合法');
  }
  return id;
}

// 用户列表（deleted=0）
adminUserRouter.get('/', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const pageNum = Number(req.query.pageNum || 1);
  const pageSize = Number(req.query.pageSize || 10);
  const { total, records } = await userRepo.page(
    pageNum, pageSize, req.query.uid || null, req.query.status, 0,
  );
  res.json(Result.successWith(new PageResult(pageNum, pageSize, total, records)));
}));

// 回收站列表（deleted=1）
adminUserRouter.get('/recycle', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const pageNum = Number(req.query.pageNum || 1);
  const pageSize = Number(req.query.pageSize || 10);
  const { total, records } = await userRepo.page(
    pageNum, pageSize, req.query.uid || null, null, 1,
  );
  res.json(Result.successWith(new PageResult(pageNum, pageSize, total, records)));
}));

// 添加用户（指定 SSO uid）
adminUserRouter.post('/', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const uid = String(req.body?.uid ?? '').trim();
  if (!uid || uid.length > 64) {
    throw new BusinessException(ResultCode.BAD_REQUEST, 'SSO 用户 uid 不能为空且长度不超过 64');
  }
  res.json(Result.successWith(await userRepo.create(uid)));
}));

// 启用 / 禁用
adminUserRouter.put('/:id/status', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  const status = Number(req.body?.status);
  if (status !== 0 && status !== 1) {
    throw new BusinessException(ResultCode.BAD_REQUEST, '状态仅支持 0-禁用 / 1-启用');
  }
  res.json(Result.successWith(await userRepo.updateStatus(parseId(req.params.id), status)));
}));

// 软删除（移入回收站）
adminUserRouter.delete('/:id', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  await userRepo.softDelete(parseId(req.params.id));
  res.json(Result.success());
}));

// 从回收站恢复
adminUserRouter.post('/:id/restore', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  res.json(Result.successWith(await userRepo.restore(parseId(req.params.id))));
}));

// 彻底删除（仅回收站中的用户）
adminUserRouter.delete('/:id/purge', asyncHandler(async (req, res) => {
  await requireAdmin(req);
  await userRepo.purge(parseId(req.params.id));
  res.json(Result.success());
}));
