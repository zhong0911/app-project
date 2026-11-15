/**
 * 路由汇总（等同 Spring 的 Controller 包扫描注册）。
 */
import { Router } from 'express';
import ssoRoutes from './sso.routes.js';
import authRoutes from './auth.routes.js';
import bffRoutes from './bff.routes.js';
import userRoutes from './user.routes.js';
import adminUserRoutes from './admin-user.routes.js';
import adminRoleRoutes from './admin-role.routes.js';
import demoRoutes from './demo.routes.js';

const router = Router();

router.use(ssoRoutes);                       // /sso/*
router.use('/api/auth', authRoutes);         // /api/auth/*
router.use('/api/bff', bffRoutes);           // /api/bff/*
router.use('/api/users', userRoutes);        // /api/users/*
router.use('/api/admin/users', adminUserRoutes); // /api/admin/users/*
router.use('/api/admin/roles', adminRoleRoutes); // /api/admin/roles/*
router.use('/api/demo', demoRoutes);         // /api/demo/*

export default router;
