<?php
/**
 * 角色仓储层（对标 Spring Boot 的 mapper/RoleMapper）：只做数据库 CRUD。
 */

namespace App\Repositories;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class RoleRepository
{
    /** 角色列表：默认只给启用角色，$includeDisabled=true 时返回全部（按 sort、id 升序） */
    public function list(bool $includeDisabled = false): Collection
    {
        $query = Role::query();
        if (! $includeDisabled) {
            $query->where('status', 1);
        }
        return $query->orderBy('sort')->orderBy('id')->get();
    }

    public function findById(int $id): ?Role
    {
        return Role::query()->where('id', $id)->first();
    }

    public function findByCode(string $code): ?Role
    {
        return Role::query()->where('code', $code)->first();
    }

    /** 新增角色（编码已由 Service 归一化并查重） */
    public function create(array $data): Role
    {
        return Role::query()->create($data);
    }

    public function update(Role $role, array $data): Role
    {
        $role->fill($data)->save();
        return $role;
    }

    public function delete(Role $role): void
    {
        $role->delete();
    }

    /** 仍在引用该角色编码的用户数（>0 时不允许删除角色） */
    public function countUsersByRoleCode(string $code): int
    {
        return User::query()->where('role', $code)->count();
    }
}
