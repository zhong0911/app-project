<?php
/**
 * 角色模型（对标 Spring Boot 的 entity/Role）。
 *
 * 子应用本地角色字典：内置 ADMIN / USER，可扩展自定义角色。
 * users.role 存的就是这里的 code；后台角色管理页直接维护这张表。
 */

namespace app\model;

use think\Model;

class Role extends Model
{
    protected $name = 'roles';
    protected $pk = 'id';

    protected $type = [
        'id' => 'integer',
        'built_in' => 'integer',
        'status' => 'integer',
        'sort' => 'integer',
        'create_time' => 'datetime',
        'update_time' => 'datetime',
    ];

    protected $field = [
        'id', 'code', 'name', 'description', 'built_in', 'status', 'sort', 'create_time', 'update_time',
    ];
}
