/**
 * 认证路由：/api/auth
 */
import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { logout, me } from '../controllers/auth.controller.js';

const router = Router();

router.get('/me', me);
router.post('/logout', asyncHandler(logout));

export default router;
