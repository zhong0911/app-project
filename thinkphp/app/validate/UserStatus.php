<?php
/**
 * 启停校验（对标 Spring Boot 的 UserStatusDTO）。
 */

namespace app\validate;

use think\Validate;

class UserStatus extends Validate
{
    protected $rule = [
        'status' => 'require|in:0,1',
    ];

    protected $message = [
        'status.require' => '状态不能为空',
        'status.in' => '状态仅支持 0-禁用 / 1-启用',
    ];
}
