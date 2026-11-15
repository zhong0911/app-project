<?php
/**
 * 角色新增 / 更新校验（对标 Spring Boot 的 dto/RoleDTO + @Valid）。
 *
 * 编码统一大写，只允许字母、数字与下划线，便于包装成 ROLE_* 权限名。
 */

namespace app\validate;

use think\Validate;

class Role extends Validate
{
    protected $rule = [
        'code' => ['require', 'regex' => '/^[A-Za-z][A-Za-z0-9_]{1,31}$/'],
        'name' => 'require|max:64',
        'description' => 'max:255',
        'status' => 'in:0,1',
        'sort' => 'integer',
    ];

    protected $message = [
        'code.require' => '角色编码不能为空',
        'code.regex' => '角色编码只允许字母、数字与下划线，长度 2-32',
        'name.require' => '角色名称不能为空',
        'name.max' => '角色名称长度不能超过 64',
        'description.max' => '角色描述长度不能超过 255',
        'status.in' => '状态仅支持 0-禁用 / 1-启用',
        'sort.integer' => '排序必须是整数',
    ];
}
