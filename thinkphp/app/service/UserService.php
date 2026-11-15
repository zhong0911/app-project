<?php
/**
 * 用户业务层（对标 Spring Boot 的 service/impl/UserServiceImpl）。
 */

namespace app\service;

use app\model\User;
use app\repository\UserRepository;
use app\support\BusinessException;
use app\support\Result;
use app\support\ResultCode;

class UserService
{
    private const ALLOWED_ROLES = ['ADMIN', 'USER'];

    public function __construct(private readonly UserRepository $repository)
    {
    }

    public function createUser(string $uid): array
    {
        $exists = $this->repository->findByUidIncludingDeleted($uid);
        if ($exists !== null) {
            if ((int) $exists->deleted === 1) {
                throw BusinessException::conflict("该 uid 已在回收站，请先恢复: {$uid}");
            }
            throw BusinessException::conflict("SSO 用户已存在: {$uid}");
        }
        // 管理员由 sso.admin_uid 配置决定（见 isAdmin），本地角色直接落 ADMIN
        return $this->toVO($this->repository->create($uid, $this->isAdmin($uid) ? 'ADMIN' : 'USER'));
    }

    public function updateUser(int $id, string $role): array
    {
        $user = $this->repository->findById($id);
        if ($user === null) {
            throw BusinessException::notFound("用户不存在: {$id}");
        }

        $role = strtoupper($role);
        if (! in_array($role, self::ALLOWED_ROLES, true)) {
            throw BusinessException::badRequest("角色不合法，仅支持 ADMIN / USER: {$role}");
        }

        $this->repository->updateRole($id, $role);
        return $this->toVO($this->repository->findById($id, true));
    }

    public function deleteUser(int $id): void
    {
        if ($this->repository->findById($id) === null) {
            throw BusinessException::notFound("用户不存在: {$id}");
        }
        $this->repository->softDelete($id);
    }

    public function getUser(int $id): array
    {
        $user = $this->repository->findById($id);
        if ($user === null) {
            throw BusinessException::notFound("用户不存在: {$id}");
        }
        return $this->toVO($user);
    }

    public function pageQuery(int $pageNum, int $pageSize, ?string $uid, ?string $role, ?int $status): array
    {
        [$records, $total] = $this->repository->page($pageNum, $pageSize, $uid, $role, $status, 0);
        return Result::page($pageNum, $pageSize, $total, array_map(fn (User $u) => $this->toVO($u), $records));
    }

    public function pageRecycle(int $pageNum, int $pageSize, ?string $uid, ?int $status): array
    {
        [$records, $total] = $this->repository->page($pageNum, $pageSize, $uid, null, $status, 1);
        return Result::page($pageNum, $pageSize, $total, array_map(fn (User $u) => $this->toVO($u), $records));
    }

    public function updateStatus(int $id, int $status): array
    {
        if (! in_array($status, [0, 1], true)) {
            throw BusinessException::badRequest('状态仅支持 0-禁用 / 1-启用');
        }
        if ($this->repository->findById($id, true) === null) {
            throw BusinessException::notFound("用户不存在: {$id}");
        }
        $this->repository->updateStatus($id, $status);
        return $this->toVO($this->repository->findById($id, true));
    }

    public function restore(int $id): array
    {
        $user = $this->repository->findById($id, true);
        if ($user === null || (int) $user->deleted !== 1) {
            throw BusinessException::notFound("回收站中不存在该用户: {$id}");
        }
        $this->repository->restore($id);
        return $this->toVO($this->repository->findById($id));
    }

    public function purge(int $id): void
    {
        $user = $this->repository->findById($id, true);
        if ($user === null || (int) $user->deleted !== 1) {
            throw BusinessException::notFound("回收站中不存在该用户: {$id}");
        }
        $this->repository->purge($id);
    }

    public function getByUid(string $uid): ?User
    {
        return $uid !== '' ? $this->repository->findByUid($uid) : null;
    }

    /** 新登录用户默认注册为 USER；配置的管理员直接 ADMIN（并发下靠唯一键兜底） */
    public function getOrCreateDefaultUser(string $uid): ?User
    {
        if ($uid === '') {
            return null;
        }

        $existing = $this->repository->findByUid($uid) ?? $this->repository->findByUidIncludingDeleted($uid);
        if ($existing !== null) {
            // 已有记录与管理员配置不一致时顺手纠正角色
            if ($this->isAdmin($uid) && $existing->role !== 'ADMIN') {
                $this->repository->updateRole((int) $existing->id, 'ADMIN');
                $existing->role = 'ADMIN';
            }
            return $existing;
        }

        try {
            return $this->repository->create($uid, $this->isAdmin($uid) ? 'ADMIN' : 'USER');
        } catch (\Throwable) {
            return $this->repository->findByUidIncludingDeleted($uid);
        }
    }

    public function isAdmin(string $uid): bool
    {
        return $uid !== '' && $uid === (string) config('sso.admin_uid');
    }

    /** 管理接口鉴权：未登录 401，非管理员 403，被禁用 403 */
    public function requireAdmin(string $uid): string
    {
        if ($uid === '') {
            throw BusinessException::unauthorized();
        }
        if (! $this->isAdmin($uid)) {
            throw BusinessException::forbidden('仅管理员可访问');
        }
        $local = $this->getByUid($uid);
        if ($local !== null && (int) $local->status === 0) {
            throw BusinessException::forbidden('账号已被禁用');
        }
        return $uid;
    }

    /** 实体转 VO（隐藏 version 等内部字段） */
    public function toVO(?User $user): ?array
    {
        if ($user === null) {
            return null;
        }

        return [
            'id' => (int) $user->id,
            'uid' => $user->uid,
            // 读时兜底：配置的管理员若库里历史角色仍是 USER，输出统一按 ADMIN
            'role' => $this->isAdmin((string) $user->uid) ? 'ADMIN' : $user->role,
            'status' => (int) $user->status,
            'deleted' => (int) $user->deleted,
            'createTime' => $user->create_time ? (string) $user->create_time : null,
            'updateTime' => $user->update_time ? (string) $user->update_time : null,
        ];
    }
}
