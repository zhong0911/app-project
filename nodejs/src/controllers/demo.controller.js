/**
 * 角色示例接口（对标 Spring Boot 的 controller/SecurityDemoController）。
 * SSO 只认证，角色由本地表 / 管理员 uid 判定。
 */
import { success } from '../utils/result.js';

/** 仅管理员可访问 */
export function adminOnly(req, res) {
  res.json(success(`你好，管理员 ${req.principal.name}`));
}

/** 已登录用户可访问 */
export function anyLoginUser(req, res) {
  res.json(success(`你好，${req.principal.name}`));
}
