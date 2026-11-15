<?php
/**
 * 角色业务层（对标 Spring Boot 的 service/impl/RoleServiceImpl）。
 *
 * 规则与 Spring Boot 一致：
 * - 编码统一去空格转大写，只允许字母开头、字母/数字/下划线，长度 2-32；
 * - 内置角色（built_in=1）不可删除、不可改编码；
 * - 仍被用户引用的角色不允许删除，避免出现「角色编码在字典里查不到」的用户。
 */

namespace App\Services;

use App\Models\Role;
use App\Repositories\RoleRepository;
use App\Support\BusinessException;
use Illuminate\Support\Str;

class RoleService
{
    /** 角色编码规则（与前端 CODE_PATTERN、Spring Boot RoleDTO 一致） */
    private const CODE_PATTERN = '/^[A-Za-z][A-Za-z0-9_]{1,31}$/';

    public function __construct(private readonly RoleRepository $repository)
    {
    }

    /** @return array<int, array<string, mixed>> */
    public function listRoles(bool $includeDisabled = false): array
    {
        return $this->repository->list($includeDisabled)
            ->map(fn (Role $role) => $this->toVO($role))
            ->all();
    }

    public function createRole(array $data): array
    {
        $code = $this->normalizeCode((string) ($data['code'] ?? ''));
        $this->assertCode($code);

        if ($this->repository->findByCode($code) !== null) {
            throw BusinessException::conflict("角色编码已存在: {$code}");
        }

        $role = $this->repository->create([
            'code' => $code,
            'name' => trim((string) ($data['name'] ?? '')),
            'description' => $this->normalizeDescription($data['description'] ?? null),
            'built_in' => 0,
            'status' => isset($data['status']) ? (int) $data['status'] : 1,
            'sort' => isset($data['sort']) ? (int) $data['sort'] : 0,
        ]);

        return $this->toVO($role);
    }

    public function updateRole(int $id, array $data): array
    {
        $role = $this->repository->findById($id);
        if ($role === null) {
            throw BusinessException::notFound("角色不存在: {$id}");
        }

        $code = $this->normalizeCode((string) ($data['code'] ?? ''));
        $this->assertCode($code);

        // 内置角色编码固定，避免改坏已有用户的角色关联
        if ($role->built_in === 1 && $role->code !== $code) {
            throw BusinessException::badRequest("内置角色编码不可修改: {$role->code}");
        }
        if ($role->code !== $code && $this->repository->findByCode($code) !== null) {
            throw BusinessException::conflict("角色编码已存在: {$code}");
        }

        $this->repository->update($role, [
            'code' => $code,
            'name' => trim((string) ($data['name'] ?? $role->name)),
            'description' => array_key_exists('description', $data)
                ? $this->normalizeDescription($data['description'])
                : $role->description,
            'status' => isset($data['status']) ? (int) $data['status'] : $role->status,
            'sort' => isset($data['sort']) ? (int) $data['sort'] : $role->sort,
        ]);

        return $this->toVO($role->refresh());
    }

    public function deleteRole(int $id): void
    {
        $role = $this->repository->findById($id);
        if ($role === null) {
            throw BusinessException::notFound("角色不存在: {$id}");
        }
        if ($role->built_in === 1) {
            throw BusinessException::badRequest("内置角色不可删除: {$role->code}");
        }

        $used = $this->repository->countUsersByRoleCode($role->code);
        if ($used > 0) {
            throw BusinessException::conflict("仍有 {$used} 个用户使用该角色，请先调整用户角色: {$role->code}");
        }

        $this->repository->delete($role);
    }

    /** 角色编码归一化：去空格并转大写 */
    private function normalizeCode(string $code): string
    {
        return Str::upper(trim($code));
    }

    private function assertCode(string $code): void
    {
        if ($code === '' || ! preg_match(self::CODE_PATTERN, $code)) {
            throw BusinessException::badRequest('角色编码只允许字母、数字与下划线，长度 2-32');
        }
    }

    private function normalizeDescription(mixed $description): ?string
    {
        $text = trim((string) ($description ?? ''));

        return $text === '' ? null : $text;
    }

    /** 实体转 VO（隐藏 version 等内部字段） */
    private function toVO(Role $role): array
    {
        return [
            'id' => (int) $role->id,
            'code' => (string) $role->code,
            'name' => (string) $role->name,
            'description' => $role->description,
            'builtIn' => (int) $role->built_in,
            'status' => (int) $role->status,
            'sort' => (int) $role->sort,
            'createTime' => optional($role->create_time)?->format('Y-m-d H:i:s'),
            'updateTime' => optional($role->update_time)?->format('Y-m-d H:i:s'),
        ];
    }
}
