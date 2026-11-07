<?php
/**
 * 更新用户校验（对标 Spring Boot 的 dto/UserUpdateDTO）。
 */

namespace app\validate;

use think\Validate;

class UserUpdate extends Validate
{
    protected $rule = [
        'id' => 'require|integer|gt:0',
        'role' => 'require|in:ADMIN,USER,admin,user',
    ];

    protected $message = [
        'id.require' => '用户 ID 不能为空',
        'id.integer' => '用户 ID 必须为整数',
        'role.require' => '角色不能为空',
        'role.in' => '角色不合法，仅支持 ADMIN / USER',
    ];
}
