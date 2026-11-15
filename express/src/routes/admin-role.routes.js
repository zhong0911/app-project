/**
 * 管理端角色路由：/api/admin/roles（仅管理员）
 */
import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';
import * as adminRoleController from '../controllers/admin-role.controller.js';

const router = Router();

router.use(asyncHandler(requireAdmin));

router.get('/', asyncHandler(adminRoleController.list));
router.post('/', asyncHandler(adminRoleController.create));
router.put('/:id', asyncHandler(adminRoleController.update));
router.delete('/:id', asyncHandler(adminRoleController.remove));

export default router;
