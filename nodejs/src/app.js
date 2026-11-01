import express from 'express';
import { Result } from './result.js';
import { userRouter } from './routes/user.routes.js';
import { authRouter } from './routes/auth.routes.js';
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

// OAuth2 客户端路由（/oauth2/{provider}/authorize、/oauth2/{provider}/callback）
app.use('/oauth2', authRouter);

// 单点退出（POST /api/auth/logout，对标 Spring Boot AuthController#logout）：
// 模板无服务端会话，销毁会话由前端清除本地凭证完成；
// 返回 ssoLogoutUrl（env SSO_LOGOUT_URI）供前端整页跳转完成 SSO 全局退出
app.post('/api/auth/logout', (req, res) => {
  res.json(Result.successWith({ ssoLogoutUrl: process.env.SSO_LOGOUT_URI || null }));
});

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
