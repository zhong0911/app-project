/**
 * BFF 路由：/api/bff
 */
import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { me } from '../controllers/bff.controller.js';

const router = Router();

router.get('/me', asyncHandler(me));

export default router;
