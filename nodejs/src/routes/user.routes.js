import { Router } from 'express';
import { Result } from '../result.js';
import { PageResult } from '../page-result.js';
import { BusinessException } from '../business-exception.js';
import { ResultCode } from '../result-code.js';

/**
 * 用户接口（RESTful 示例，对标 Spring Boot UserController）。
 *
 * 统一返回 Result 五字段；分页返回 PageResult。
 * 此处用内存 Map 模拟数据源，接入数据库时替换为仓储层即可。
 */
const users = new Map([
  [1, { id: 1, uid: '1', role: 'ADMIN', createTime: '2026-11-01 10:00:00' }],
  [2, { id: 2, uid: '2', role: 'USER', createTime: '2026-11-01 10:05:00' }],
]);
let seq = 2;

export const userRouter = Router();

// 创建用户（POST，对标 @PostMapping）
userRouter.post('/', (req, res) => {
  const { uid } = req.body ?? {};
  if (typeof uid !== 'string' || uid === '') {
    throw new BusinessException(ResultCode.BAD_REQUEST, 'uid 不能为空');
  }
  for (const u of users.values()) {
    if (u.uid === uid) {
      throw new BusinessException(ResultCode.DATA_CONFLICT, 'uid 已存在');
    }
  }
  seq += 1;
  const user = { id: seq, uid, role: 'USER', createTime: new Date().toISOString().slice(0, 19).replace('T', ' ') };
  users.set(seq, user);
  res.json(Result.successWith(user));
});

// 更新用户（PUT，对标 @PutMapping）
userRouter.put('/', (req, res) => {
  const { id, role } = req.body ?? {};
  const user = users.get(Number(id));
  if (!user) {
    throw new BusinessException(ResultCode.NOT_FOUND, '用户不存在');
  }
  if (role !== undefined) {
    user.role = role;
  }
  res.json(Result.successWith(user));
});

// 删除用户（DELETE /{id}，对标 @DeleteMapping）
userRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!users.has(id)) {
    throw new BusinessException(ResultCode.NOT_FOUND, '用户不存在');
  }
  users.delete(id);
  res.json(Result.success());
});

// 查询用户详情（GET /{id}，对标 @GetMapping("/{id}")）
userRouter.get('/:id', (req, res) => {
  const user = users.get(Number(req.params.id));
  if (!user) {
    throw new BusinessException(ResultCode.NOT_FOUND, '用户不存在');
  }
  res.json(Result.successWith(user));
});

// 分页查询用户列表（GET /，对标 @GetMapping 分页）
userRouter.get('/', (req, res) => {
  const pageNum = Math.max(1, Number(req.query.pageNum) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize) || 10));
  const all = [...users.values()];
  const total = all.length;
  const records = all.slice((pageNum - 1) * pageSize, pageNum * pageSize);
  res.json(Result.successWith(new PageResult(pageNum, pageSize, total, records)));
});
