<?php
/**
 * 用户业务层（对标 Spring Boot 的 service/impl/UserServiceImpl）。
 */

namespace App\Services;

use App\Models\User;
use App\Repositories\UserRepository;
use App\Support\BusinessException;
use App\Support\Result;
use App\Support\ResultCode;
use App\Support\UserIdentity;

class UserService
{
    private const ALLOWED_ROLES = ['ADMIN', 'USER'];

    public function __construct(private readonly UserRepository $repository)
    {
    }

    /**
     * 管理员手动添加用户：只认「用户唯一标识」（sub），可能是整数 uid / username / email / phone，
     * 一律按字符串落库。
     */
    public function createUser(string $uid): array
    {
        $uid = UserIdentity::orEmpty($uid);
        if ($uid === '') {
            throw BusinessException::badRequest('用户标识不能为空');
        }
        if (! UserIdentity::fits($uid)) {
            throw BusinessException::badRequest('用户标识长度不能超过 ' . UserIdentity::MAX_LENGTH . ' 个字符');
        }

        $exists = $this->repository->findByUidIncludingDeleted($uid);
        if ($exists !== null) {
            if ($exists->deleted === 1) {
                throw BusinessException::conflict("该用户标识已在回收站，请先恢复: {$uid}");
            }
            throw BusinessException::conflict("该用户已存在: {$uid}");
        }
        return $this->toVO($this->repository->create($uid));
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
        return Result::page($pageNum, $pageSize, $total, $records->map(fn (User $u) => $this->toVO($u))->all());
    }

    public function pageRecycle(int $pageNum, int $pageSize, ?string $uid, ?int $status): array
    {
        [$records, $total] = $this->repository->page($pageNum, $pageSize, $uid, null, $status, 1);
        return Result::page($pageNum, $pageSize, $total, $records->map(fn (User $u) => $this->toVO($u))->all());
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
        if ($user === null || $user->deleted !== 1) {
            throw BusinessException::notFound("回收站中不存在该用户: {$id}");
        }
        $this->repository->restore($id);
        return $this->toVO($this->repository->findById($id));
    }

    public function purge(int $id): void
    {
        $user = $this->repository->findById($id, true);
        if ($user === null || $user->deleted !== 1) {
            throw BusinessException::notFound("回收站中不存在该用户: {$id}");
        }
        $this->repository->purge($id);
    }

    public function getByUid(string $uid): ?User
    {
        $uid = UserIdentity::orEmpty($uid);

        return $uid !== '' ? $this->repository->findByUid($uid) : null;
    }

    /** 新登录用户默认注册为 USER（并发下靠唯一键兜底） */
    public function getOrCreateDefaultUser(string $uid): ?User
    {
        $uid = UserIdentity::orEmpty($uid);

        // 空标识或超过列宽（VARCHAR(64)）时不落库：既不截断避免不同用户撞键，也不阻断登录，
        // 这类用户在本地没有角色记录，按 SSO 下发权限处理
        if ($uid === '' || ! UserIdentity::fits($uid)) {
            return null;
        }

        $existing = $this->repository->findByUid($uid) ?? $this->repository->findByUidIncludingDeleted($uid);
        if ($existing !== null) {
            // 管理员身份由 sso.admin_uid 决定，本地角色与配置不一致时顺手纠正
            if ($this->isAdmin($uid) && $existing->role !== 'ADMIN') {
                $this->repository->updateRole($existing->id, 'ADMIN');
                $existing->refresh();
            }
            return $existing;
        }

        try {
            return $this->repository->create($uid);
        } catch (\Throwable) {
            return $this->repository->findByUidIncludingDeleted($uid);
        }
    }

    public function isAdmin(string $uid): bool
    {
        $adminUid = trim((string) config('sso.admin_uid'));

        return $uid !== '' && $adminUid !== '' && $uid === $adminUid;
    }

    /** 管理接口鉴权：未登录 401，非管理员 403，被禁用 403 */
    public function requireAdmin(string $uid): string
    {
        $uid = UserIdentity::orEmpty($uid);
        if ($uid === '') {
            throw BusinessException::unauthorized();
        }
        if (! $this->isAdmin($uid)) {
            throw BusinessException::forbidden('仅管理员可访问');
        }
        $local = $this->getByUid($uid);
        if ($local !== null && $local->status === 0) {
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
            // 唯一标识一律输出字符串：整型 uid 也按字符串返回，前端不用区分类型
            'uid' => (string) $user->uid,
            // 读时兜底：配置的管理员若库里历史角色仍是 USER，输出统一按 ADMIN
            'role' => $this->isAdmin((string) $user->uid) ? 'ADMIN' : $user->role,
            'status' => (int) $user->status,
            'deleted' => (int) $user->deleted,
            'createTime' => optional($user->create_time)?->format('Y-m-d H:i:s'),
            'updateTime' => optional($user->update_time)?->format('Y-m-d H:i:s'),
        ];
    }
}
