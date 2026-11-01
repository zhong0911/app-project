<?php

declare(strict_types=1);

namespace AntX\Template;

/**
 * 用户接口（RESTful 示例，对标 Spring Boot UserController）。
 *
 * 统一返回 Result 五字段；分页返回 PageResult。
 * 此处用内存数组模拟数据源，接入数据库时替换为仓储层即可。
 */
final class UserController
{
    /** 内存用户表（id => 用户数组），仅示例 */
    private static array $users = [
        1 => ['id' => 1, 'uid' => '1', 'role' => 'ADMIN', 'createTime' => '2026-11-01 10:00:00'],
        2 => ['id' => 2, 'uid' => '2', 'role' => 'USER', 'createTime' => '2026-11-01 10:05:00'],
    ];
    private static int $seq = 2;

    /** 创建用户（POST /api/users，对标 @PostMapping） */
    public function create(array $body): Result
    {
        $uid = $body['uid'] ?? null;
        if (!is_string($uid) || $uid === '') {
            throw new BusinessException(ResultCode::BAD_REQUEST, 'uid 不能为空');
        }
        if (in_array($uid, array_column(self::$users, 'uid'), true)) {
            throw new BusinessException(ResultCode::DATA_CONFLICT, 'uid 已存在');
        }
        $id = ++self::$seq;
        self::$users[$id] = [
            'id' => $id,
            'uid' => $uid,
            'role' => 'USER',
            'createTime' => date('Y-m-d H:i:s'),
        ];
        return Result::successWith(self::$users[$id]);
    }

    /** 更新用户（PUT /api/users，对标 @PutMapping） */
    public function update(array $body): Result
    {
        $id = (int) ($body['id'] ?? 0);
        if (!isset(self::$users[$id])) {
            throw new BusinessException(ResultCode::NOT_FOUND, '用户不存在');
        }
        if (isset($body['role'])) {
            self::$users[$id]['role'] = (string) $body['role'];
        }
        return Result::successWith(self::$users[$id]);
    }

    /** 删除用户（DELETE /api/users/{id}，逻辑删除，对标 @DeleteMapping） */
    public function delete(int $id): Result
    {
        if (!isset(self::$users[$id])) {
            throw new BusinessException(ResultCode::NOT_FOUND, '用户不存在');
        }
        unset(self::$users[$id]);
        return Result::success();
    }

    /** 查询用户详情（GET /api/users/{id}，对标 @GetMapping("/{id}")） */
    public function detail(int $id): Result
    {
        if (!isset(self::$users[$id])) {
            throw new BusinessException(ResultCode::NOT_FOUND, '用户不存在');
        }
        return Result::successWith(self::$users[$id]);
    }

    /** 分页查询用户列表（GET /api/users?pageNum=&pageSize=，对标 @GetMapping 分页） */
    public function page(int $pageNum, int $pageSize): Result
    {
        $pageNum = max(1, $pageNum);
        $pageSize = max(1, min(100, $pageSize));
        $all = array_values(self::$users);
        $total = count($all);
        $offset = ($pageNum - 1) * $pageSize;
        $records = array_slice($all, $offset, $pageSize);
        return Result::successWith(new PageResult($pageNum, $pageSize, $total, $records));
    }
}
