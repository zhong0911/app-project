/**
 * 管理端用户路由：/api/admin/users（仅管理员）
 */
import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import * as adminUserController from '../controllers/admin-user.controller.js';

const router = Router();

router.use(asyncHandler(requireAdmin));

router.get('/', asyncHandler(adminUserController.page));
router.get('/recycle', asyncHandler(adminUserController.recycle));
router.post('/', asyncHandler(adminUserController.create));
router.put('/:id/status', asyncHandler(adminUserController.updateStatus));
router.delete('/:id', asyncHandler(adminUserController.remove));
router.post('/:id/restore', asyncHandler(adminUserController.restore));
router.delete('/:id/purge', asyncHandler(adminUserController.purge));

export default router;
