/**
 * 用户路由：/api/users（需登录）
 */
import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { requireLogin } from '../middlewares/auth.middleware.js';
import * as userController from '../controllers/user.controller.js';

const router = Router();

router.use(requireLogin);

router.get('/', asyncHandler(userController.page));
router.post('/', asyncHandler(userController.create));
router.put('/', asyncHandler(userController.update));
router.get('/:id', asyncHandler(userController.detail));
router.delete('/:id', asyncHandler(userController.remove));

export default router;
