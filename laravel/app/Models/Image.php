<?php
/**
 * 图片实体（对标 Spring Boot 的 entity/Image）。
 *
 * 表里用的是 create_time / update_time，与 users 表保持一致。
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Image extends Model
{
    protected $table = 'images';

    const CREATED_AT = 'create_time';
    const UPDATED_AT = 'update_time';

    protected $fillable = [
        'uuid', 'origin_name', 'ext', 'mime_type', 'size', 'hash',
        'width', 'height', 'storage_key', 'uid', 'visit_count', 'deleted', 'version',
    ];

    protected $casts = [
        'id' => 'integer',
        'size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'visit_count' => 'integer',
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
}
