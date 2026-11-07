<?php
/**
 * 用户仓储层（对标 Spring Boot 的 mapper/UserMapper）：只做数据库 CRUD。
 */

namespace app\repository;

use app\model\User;

class UserRepository
{
    public function findById(int $id, bool $includeDeleted = false): ?User
    {
        $query = User::where('id', $id);
        if (! $includeDeleted) {
            $query->where('deleted', 0);
        }
        return $query->find();
    }

    public function findByUid(string $uid): ?User
    {
        return User::where('uid', $uid)->where('deleted', 0)->find();
    }

    /** 含回收站记录：创建前查重 */
    public function findByUidIncludingDeleted(string $uid): ?User
    {
        return User::where('uid', $uid)->find();
    }

    /**
     * 分页查询。
     *
     * @return array{0: array<int, User>, 1: int}
     */
    public function page(
        int $pageNum,
        int $pageSize,
        ?string $uid = null,
        ?string $role = null,
        ?int $status = null,
        int $deleted = 0,
    ): array {
        $query = User::where('deleted', $deleted);
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
        $records = $query->order('create_time desc, id desc')
            ->page($pageNum, $pageSize)
            ->select()
            ->all();

        return [$records, $total];
    }

    public function create(string $uid): User
    {
        return User::create([
            'uid' => $uid,
            'role' => 'USER',
            'status' => 1,
            'deleted' => 0,
            'version' => 1,
            'create_time' => date('Y-m-d H:i:s'),
            'update_time' => date('Y-m-d H:i:s'),
        ]);
    }

    public function updateRole(int $id, string $role): void
    {
        User::where('id', $id)->where('deleted', 0)->update([
            'role' => $role,
            'version' => \think\facade\Db::raw('version + 1'),
        ]);
    }

    public function updateStatus(int $id, int $status): void
    {
        User::where('id', $id)->update(['status' => $status]);
    }

    public function softDelete(int $id): void
    {
        User::where('id', $id)->where('deleted', 0)->update(['deleted' => 1]);
    }

    public function restore(int $id): void
    {
        User::where('id', $id)->where('deleted', 1)->update(['deleted' => 0]);
    }

    public function purge(int $id): void
    {
        User::where('id', $id)->where('deleted', 1)->delete();
    }
}
