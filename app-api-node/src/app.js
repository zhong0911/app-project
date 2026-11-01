import express from 'express';
import { ApiResponse } from './api-response.js';
import { userRouter } from './routes/user.routes.js';
import { globalErrorHandler } from './global-error-handler.js';

/**
 * AntX Node.js 模板 入口（对标 Spring Boot 模板 app-api）。
 *
 * 运行：node src/app.js （开发：node --watch src/app.js）
 */
const app = express();

// 解析 JSON body
app.use(express.json());

// RESTful 用户路由
app.use('/api/users', userRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json(ApiResponse.successWith({ status: 'up', service: 'app-api-node' }));
});

// 404：未匹配任何路由 -> 统一响应
app.use((req, res) => {
  res.status(404).json(ApiResponse.errorMsg(404, '请求资源不存在'));
});

// 全局异常处理（必须放在最后）
app.use(globalErrorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`[AntX Node] 服务已启动: http://localhost:${PORT}`);
});
