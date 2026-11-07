/**
 * 路由汇总（对标 Spring Boot 的 @RequestMapping 注册）。
 * 每个模块一个路由文件，最终在 routes/index.js 挂载。
 */
import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { authorize, callback } from '../controllers/sso.controller.js';

const router = Router();

// 公开：SSO 登录入口与回调（路径全后端统一 /sso/xxx）
router.get('/sso/authorize', authorize);
router.get('/sso/callback', asyncHandler(callback));

export default router;
