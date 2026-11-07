/**
 * 权限示例路由：/api/demo
 */
import { Router } from 'express';
import { requireAdmin, requireLogin } from '../middlewares/auth.middleware.js';
import { adminOnly, anyLoginUser } from '../controllers/demo.controller.js';

const router = Router();

router.get('/admin', requireAdmin, adminOnly);
router.get('/user', requireLogin, anyLoginUser);

export default router;
