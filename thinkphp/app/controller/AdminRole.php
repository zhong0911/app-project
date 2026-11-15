<?php
/**
 * 管理后台角色字典（对标 Spring Boot 的 controller/RoleController）。
 * 仅管理员可访问（Admin 中间件）。
 *
 * 角色是子应用本地字典，内置 ADMIN / USER（built_in=1：编码不可改、不可删），
 * 可新增自定义角色；users.role 引用这里的 code，仍被用户引用的角色不可删。
 */

namespace app\controller;

use app\BaseController;
use app\service\RoleService;
use app\support\Result;
use app\validate\Role;
use think\exception\ValidateException;

class AdminRole extends BaseController
{
    /**
     * GET /api/admin/roles?includeDisabled=true
     * 角色列表：默认只给启用角色，includeDisabled=true 返回全部。
     */
    public function list()
    {
        $includeDisabled = filter_var($this->request->get('includeDisabled', false), FILTER_VALIDATE_BOOLEAN);

        return Result::success((new RoleService())->listRoles($includeDisabled));
    }

    /** POST /api/admin/roles 新增角色 */
    public function create()
    {
        $data = $this->only(['code', 'name', 'description', 'status', 'sort']);
        $this->check($data);

        return Result::success((new RoleService())->createRole($data));
    }

    /** PUT /api/admin/roles/:id 更新角色（内置角色编码不可改） */
    public function update($id)
    {
        $data = $this->only(['code', 'name', 'description', 'status', 'sort']);
        $this->check($data);

        return Result::success((new RoleService())->updateRole((int) $id, $data));
    }

    /** DELETE /api/admin/roles/:id 删除角色（内置角色、仍被用户使用的角色不可删） */
    public function remove($id)
    {
        (new RoleService())->deleteRole((int) $id);

        return Result::success();
    }

    /** 只取业务字段，丢掉请求里的其他键 */
    private function only(array $fields): array
    {
        $result = [];
        foreach ($fields as $field) {
            if ($this->request->has($field)) {
                $result[$field] = $this->request->param($field);
            }
        }
        return $result;
    }

    private function check(array $data): void
    {
        $validate = validate(Role::class);
        if (! $validate->check($data)) {
            throw new ValidateException($validate->getError());
        }
    }
}
