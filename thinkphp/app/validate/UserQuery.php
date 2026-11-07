<?php
/**
 * 分页查询校验（对标 Spring Boot 的 dto/UserQueryDTO）。
 */

namespace app\validate;

use think\Validate;

class UserQuery extends Validate
{
    protected $rule = [
        'pageNum' => 'integer|gt:0',
        'pageSize' => 'integer|between:1,500',
        'uid' => 'max:64',
        'status' => 'in:0,1',
    ];

    protected $message = [
        'pageNum.gt' => '页码必须大于 0',
        'pageSize.between' => '每页条数必须在 1-500 之间',
        'status.in' => '状态仅支持 0 / 1',
    ];
}
