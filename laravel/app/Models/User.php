<?php
/**
 * 用户实体（对标 Spring Boot 的 entity/User）。
 *
 * 表 users 以 SSO uid 为身份键：用户名/昵称/邮箱由 SSO 提供，本地只维护角色、启停、软删除。
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    protected $table = 'users';

    /** 表里用的是 create_time / update_time，不是 Laravel 默认的 created_at / updated_at */
    const CREATED_AT = 'create_time';
    const UPDATED_AT = 'update_time';

    protected $fillable = ['uid', 'role', 'status', 'deleted', 'version'];

    protected $casts = [
        'id' => 'integer',
        'status' => 'integer',
        'deleted' => 'integer',
        'version' => 'integer',
        'create_time' => 'datetime',
        'update_time' => 'datetime',
    ];

    /** 未删除作用域（对应 MyBatis-Plus 的逻辑删除过滤） */
    public function scopeActive($query)
    {
        return $query->where('deleted', 0);
    }

    public function scopeRecycled($query)
    {
        return $query->where('deleted', 1);
    }

    public function isAdmin(): bool
    {
        return strtoupper($this->role) === 'ADMIN';
    }
}
