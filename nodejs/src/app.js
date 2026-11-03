import express from 'express';
import { Result } from './result.js';
import { userRouter } from './routes/user.routes.js';
import { authRouter, authApiRouter } from './routes/auth.routes.js';
import { adminUserRouter } from './routes/admin-user.routes.js';
import { bffRouter } from './routes/bff.routes.js';
import { globalErrorHandler } from './global-error-handler.js';

/**
 * AntX Node.js 模板 入口（对标 Spring Boot 模板 springboot）。
 *
 * 运行：node src/app.js （开发：node --watch src/app.js）
 */
const app = express();

// 解析 JSON body
app.use(express.json());

// RESTful 用户路由
app.use('/api/users', userRouter);

// 管理后台用户管理（仅管理员）与 BFF 登录态
app.use('/api/admin/users', adminUserRouter);
app.use('/api/bff', bffRouter);

// OAuth2 客户端路由（/sso/authorize、/sso/callback）
app.use('/sso', authRouter);

// 认证 API（POST /api/auth/logout：撤销 refresh_token + 销毁服务端会话，对标 Spring Boot AuthController#logout）
app.use('/api/auth', authApiRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json(Result.successWith({ status: 'up', service: 'nodejs' }));
});

// 404：未匹配任何路由 -> 统一响应
app.use((req, res) => {
  res.status(404).json(Result.errorMsg(404, '请求资源不存在'));
});

// 全局异常处理（必须放在最后）
app.use(globalErrorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[AntX Node] 服务已启动: http://localhost:${PORT}`);
});
