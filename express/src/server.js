/**
 * 服务启动（对标 Spring Boot 的 main 方法：启动容器 + 监听端口）。
 */
import app from './app.js';
import { config } from './config/index.js';
import { pool } from './config/database.js';

const server = app.listen(config.app.port, () => {
  console.log(`[boot] ${config.app.name} 已启动: http://localhost:${config.app.port}`);
  console.log(`[boot] SSO 回调地址: ${config.sso.redirectUri}`);
});

/** 优雅退出：关连接池 */
const shutdown = async (signal) => {
  console.log(`\n[shutdown] ${signal}，正在关闭...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
