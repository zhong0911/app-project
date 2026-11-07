<?php
/**
 * 创建用户校验（对标 Spring Boot 的 dto/UserCreateDTO + @Valid）。
 */

namespace app\validate;

use think\Validate;

class UserCreate extends Validate
{
    protected $rule = [
        'uid' => 'require|max:64',
    ];

    protected $message = [
        'uid.require' => 'SSO 用户 uid 不能为空',
        'uid.max' => 'uid 长度不能超过 64 个字符',
    ];
}
