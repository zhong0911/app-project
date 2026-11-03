import mysql from 'mysql2/promise';

/**
 * MySQL 连接池（对标 Spring Boot 模板 DataSource 配置）。
 *
 * 环境变量与 springboot 模板保持一致：
 *   DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'antx_template',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
