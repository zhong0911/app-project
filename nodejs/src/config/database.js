/**
 * 数据库连接池（对标 Spring Boot 的 DataSource）。
 * 使用 mysql2/promise，查询统一走 `db.query` / `db.execute`。
 */
import mysql from 'mysql2/promise';
import { config } from './index.js';

const poolOptions = config.db.url
  ? config.db.url
  : {
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
    };

export const pool = mysql.createPool({
  ...(typeof poolOptions === 'string'
    ? { uri: poolOptions }
    : poolOptions),
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true,
});

/** 简单查询封装：返回行数组 */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** 事务封装：回调里用同一个连接执行 */
export async function transaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
