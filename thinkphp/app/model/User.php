<?php
/**
 * 用户模型（对标 Spring Boot 的 entity/User）。
 *
 * 表 users 以 SSO uid 为身份键：用户名/昵称/邮箱由 SSO 提供，本地只维护角色、启停、软删除。
 */

namespace app\model;

use think\Model;

class User extends Model
{
    protected $name = 'users';
    protected $pk = 'id';

    protected $type = [
        'id' => 'integer',
        'status' => 'integer',
        'deleted' => 'integer',
        'version' => 'integer',
        'create_time' => 'datetime',
        'update_time' => 'datetime',
    ];

    protected $field = [
        'id', 'uid', 'role', 'status', 'deleted', 'version', 'create_time', 'update_time',
    ];

    /** 未删除作用域 */
    public function scopeActive($query)
    {
        $query->where('deleted', 0);
    }

    public function scopeRecycled($query)
    {
        $query->where('deleted', 1);
    }
}
