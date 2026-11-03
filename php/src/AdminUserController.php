<?php

declare(strict_types=1);

namespace AntX\Template;

/**
 * 管理后台用户管理接口（仅管理员可访问，对标 Spring Boot AdminUserController）。
 *
 *   - GET    /api/admin/users               用户列表（不含回收站）
 *   - POST   /api/admin/users               添加用户（指定 SSO uid）
 *   - PUT    /api/admin/users/{id}/status   启用 / 禁用
 *   - DELETE /api/admin/users/{id}          软删除（移入回收站）
 *   - GET    /api/admin/users/recycle       回收站列表
 *   - POST   /api/admin/users/{id}/restore  从回收站恢复
 *   - DELETE /api/admin/users/{id}/purge    彻底删除
 */
final class AdminUserController
{
    private UserRepository $repository;

    public function __construct()
    {
        $this->repository = new UserRepository();
    }

    /** 用户列表（deleted=0） */
    public function page(int $pageNum, int $pageSize, ?string $uid, ?int $status): Result
    {
        Security::requireAdmin();
        $data = $this->repository->page($pageNum, $pageSize, $uid, $status, 0);
        return Result::successWith(new PageResult($pageNum, $pageSize, $data['total'], $data['records']));
    }

    /** 回收站列表（deleted=1） */
    public function recycle(int $pageNum, int $pageSize, ?string $uid): Result
    {
        Security::requireAdmin();
        $data = $this->repository->page($pageNum, $pageSize, $uid, null, 1);
        return Result::successWith(new PageResult($pageNum, $pageSize, $data['total'], $data['records']));
    }

    /** 添加用户（指定 SSO uid） */
    public function create(array $body): Result
    {
        Security::requireAdmin();
        $uid = $body['uid'] ?? null;
        if (!is_string($uid) || trim($uid) === '' || strlen(trim($uid)) > 64) {
            throw new BusinessException(ResultCode::BAD_REQUEST, 'SSO 用户 uid 不能为空且长度不超过 64');
        }
        return Result::successWith($this->repository->create(trim($uid)));
    }

    /** 启用 / 禁用 */
    public function updateStatus(int $id, array $body): Result
    {
        Security::requireAdmin();
        $status = $body['status'] ?? null;
        if (!is_int($status) && !(is_string($status) && ctype_digit($status))) {
            throw new BusinessException(ResultCode::BAD_REQUEST, '状态仅支持 0-禁用 / 1-启用');
        }
        return Result::successWith($this->repository->updateStatus($id, (int) $status));
    }

    /** 软删除（移入回收站） */
    public function delete(int $id): Result
    {
        Security::requireAdmin();
        $this->repository->softDelete($id);
        return Result::success();
    }

    /** 从回收站恢复 */
    public function restore(int $id): Result
    {
        Security::requireAdmin();
        return Result::successWith($this->repository->restore($id));
    }

    /** 彻底删除（仅回收站中的用户） */
    public function purge(int $id): Result
    {
        Security::requireAdmin();
        $this->repository->purge($id);
        return Result::success();
    }
}
