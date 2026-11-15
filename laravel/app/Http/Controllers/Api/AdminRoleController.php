<?php
/**
 * 管理后台角色字典（对标 Spring Boot 的 controller/RoleController）。
 * 仅管理员可访问（sso.admin 中间件）。
 *
 * 角色是子应用本地字典，内置 ADMIN / USER（built_in=1：编码不可改、不可删），
 * 可新增自定义角色；users.role 引用这里的 code，仍被用户引用的角色不可删。
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RoleRequest;
use App\Services\RoleService;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminRoleController extends Controller
{
    public function __construct(private readonly RoleService $roleService)
    {
    }

    /**
     * GET /api/admin/roles?includeDisabled=true
     * 角色列表：默认只给启用角色，includeDisabled=true 返回全部。
     */
    public function list(Request $request): JsonResponse
    {
        $includeDisabled = filter_var($request->query('includeDisabled', false), FILTER_VALIDATE_BOOLEAN);

        return Result::success($this->roleService->listRoles($includeDisabled));
    }

    /** POST /api/admin/roles 新增角色 */
    public function create(RoleRequest $request): JsonResponse
    {
        return Result::success($this->roleService->createRole($request->validated()));
    }

    /** PUT /api/admin/roles/{id} 更新角色（内置角色编码不可改） */
    public function update(int $id, RoleRequest $request): JsonResponse
    {
        return Result::success($this->roleService->updateRole($id, $request->validated()));
    }

    /** DELETE /api/admin/roles/{id} 删除角色（内置角色、仍被用户使用的角色不可删） */
    public function remove(int $id): JsonResponse
    {
        $this->roleService->deleteRole($id);
        return Result::success();
    }
}
