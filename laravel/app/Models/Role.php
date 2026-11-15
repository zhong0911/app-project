<?php
/**
 * 角色实体（对标 Spring Boot 的 entity/Role）。
 *
 * 子应用本地角色字典：内置 ADMIN / USER，可扩展自定义角色。
 * users.role 存的就是这里的 code；后台角色管理页直接维护这张表。
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $table = 'roles';

    /** 表里用的是 create_time / update_time，不是 Laravel 默认的 created_at / updated_at */
    const CREATED_AT = 'create_time';
    const UPDATED_AT = 'update_time';

    protected $fillable = ['code', 'name', 'description', 'built_in', 'status', 'sort'];

    protected $casts = [
        'id' => 'integer',
        'built_in' => 'integer',
        'status' => 'integer',
        'sort' => 'integer',
        'create_time' => 'datetime',
        'update_time' => 'datetime',
    ];
}
