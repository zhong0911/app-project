<?php
/**
 * 管理后台角色字典（对标 Spring Boot 的 controller/RoleController）。
 * 仅管理员可访问（sso.admin 中间件）。
 *
 * 模板里角色是子应用本地字典，内置 ADMIN / USER，users.role 引用这里的 code；
 * 本实现不落角色表，内置两项之外把 users 表里已出现过的自定义 role 一并补出来，
 * 保证管理后台的筛选下拉与角色标签不会出现「查不到名字」的编码。
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminRoleController extends Controller
{
    /** 内置角色（users.role 的取值来源） */
    private const BUILTIN_ROLES = [
        ['code' => 'ADMIN', 'name' => '管理员', 'enabled' => true, 'builtin' => true, 'sort' => 1],
        ['code' => 'USER', 'name' => '普通用户', 'enabled' => true, 'builtin' => true, 'sort' => 2],
    ];

    /**
     * GET /api/admin/roles?includeDisabled=true
     * 角色列表：默认只给启用角色，includeDisabled=true 返回全部。
     */
    public function list(Request $request): JsonResponse
    {
        $includeDisabled = filter_var($request->query('includeDisabled', false), FILTER_VALIDATE_BOOLEAN);

        $roles = self::BUILTIN_ROLES;
        $codes = array_column($roles, 'code');

        // 已落库的自定义角色：去重补进字典，避免 users.role 出现字典外的编码
        $used = User::query()->distinct()->pluck('role')->all();
        foreach ($used as $code) {
            $code = trim((string) $code);
            if ($code === '' || in_array($code, $codes, true)) {
                continue;
            }
            $roles[] = [
                'code' => $code,
                'name' => $code,
                'enabled' => true,
                'builtin' => false,
                'sort' => count($roles) + 1,
            ];
            $codes[] = $code;
        }

        if (! $includeDisabled) {
            // 当前角色字典没有禁用态；保留参数语义，接入角色表后在此过滤 enabled=false
            $roles = array_values(array_filter($roles, static fn (array $role): bool => $role['enabled']));
        }

        return Result::success($roles);
    }
}
