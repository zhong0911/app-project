<?php
/**
 * 角色仓储层（对标 Spring Boot 的 mapper/RoleMapper）：只做数据库 CRUD。
 */

namespace app\repository;

use app\model\Role;
use app\model\User;

class RoleRepository
{
    /**
     * 角色列表：默认只给启用角色，$includeDisabled=true 时返回全部（按 sort、id 升序）。
     *
     * @return array<int, Role>
     */
    public function list(bool $includeDisabled = false): array
    {
        $query = Role::order('sort asc, id asc');
        if (! $includeDisabled) {
            $query->where('status', 1);
        }
        return $query->select()->all();
    }

    public function findById(int $id): ?Role
    {
        return Role::where('id', $id)->find();
    }

    public function findByCode(string $code): ?Role
    {
        return Role::where('code', $code)->find();
    }

    public function create(array $data): Role
    {
        return Role::create($data);
    }

    public function update(Role $role, array $data): Role
    {
        $role->save($data);
        return $role;
    }

    public function delete(Role $role): void
    {
        $role->delete();
    }

    /** 仍在引用该角色编码的用户数（>0 时不允许删除角色） */
    public function countUsersByRoleCode(string $code): int
    {
        return (int) User::where('role', $code)->count();
    }
}
