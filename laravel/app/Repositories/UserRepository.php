<?php
/**
 * 用户仓储层（对标 Spring Boot 的 mapper/UserMapper）：只做数据库 CRUD。
 */

namespace App\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class UserRepository
{
    public function findById(int $id, bool $includeDeleted = false): ?User
    {
        $query = User::query()->where('id', $id);
        if (! $includeDeleted) {
            $query->where('deleted', 0);
        }
        return $query->first();
    }

    public function findByUid(string $uid): ?User
    {
        return User::query()->where('uid', $uid)->where('deleted', 0)->first();
    }

    /** 含回收站记录：创建前查重，避免软删除后重复插入触发唯一键冲突 */
    public function findByUidIncludingDeleted(string $uid): ?User
    {
        return User::query()->where('uid', $uid)->first();
    }

    /**
     * 分页查询。
     *
     * @return array{0: Collection, 1: int}
     */
    public function page(
        int $pageNum,
        int $pageSize,
        ?string $uid = null,
        ?string $role = null,
        ?int $status = null,
        int $deleted = 0,
    ): array {
        $query = User::query()->where('deleted', $deleted);

        if ($uid !== null && $uid !== '') {
            $query->where('uid', $uid);
        }
        if ($role !== null && $role !== '') {
            $query->where('role', $role);
        }
        if ($status !== null) {
            $query->where('status', $status);
        }

        $total = (clone $query)->count();
        $records = $query->orderByDesc('create_time')
            ->orderByDesc('id')
            ->offset(($pageNum - 1) * $pageSize)
            ->limit($pageSize)
            ->get();

        return [$records, $total];
    }

    public function create(string $uid): User
    {
        // 管理员由 sso.admin_uid 配置决定（见 UserService::isAdmin），本地角色直接落 ADMIN，
        // 否则后台列表里管理员会显示成普通用户
        $adminUid = trim((string) config('sso.admin_uid'));

        return User::query()->create([
            'uid' => $uid,
            'role' => ($adminUid !== '' && $uid === $adminUid) ? 'ADMIN' : 'USER',
            'status' => 1,
            'deleted' => 0,
            'version' => 1,
        ]);
    }

    public function updateRole(int $id, string $role): void
    {
        User::query()->where('id', $id)->where('deleted', 0)->update([
            'role' => $role,
            'version' => \DB::raw('version + 1'),
        ]);
    }

    public function updateStatus(int $id, int $status): void
    {
        User::query()->where('id', $id)->update(['status' => $status]);
    }

    public function softDelete(int $id): void
    {
        User::query()->where('id', $id)->where('deleted', 0)->update(['deleted' => 1]);
    }

    public function restore(int $id): void
    {
        User::query()->where('id', $id)->where('deleted', 1)->update(['deleted' => 0]);
    }

    public function purge(int $id): void
    {
        User::query()->where('id', $id)->where('deleted', 1)->delete();
    }
}
