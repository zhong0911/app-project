<?php
/**
 * 图床配置（对标 Spring Boot 的 image.* 配置项）。
 * 存储位置由 IMAGE_DISK 决定：images-本地磁盘 / s3-MinIO 或云对象存储。
 */
return [
    // 存储磁盘：对应 config/filesystems.php 的 disks 键
    'disk' => env('IMAGE_DISK', 'images'),

    // 图片直链域名（生产建议独立二级域名，如 https://img.antx.cc；留空则用 APP_URL）
    'domain' => env('IMAGE_DOMAIN', ''),

    // 图片公开访问路径前缀：/i/{uuid}
    'prefix' => env('IMAGE_PREFIX', 'i'),

    // 单图大小上限（字节），默认 10MB
    'max_size' => (int) env('IMAGE_MAX_SIZE', 10 * 1024 * 1024),

    // 允许的图片类型（按文件内容识别出的 MIME，不信任后缀）
    'allowed_mime' => [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/avif',
    ],

    // 是否累计访问次数（每次读图 +1，会带来一次数据库写；量大可关掉改用 Nginx 日志统计）
    'count_visit' => (bool) env('IMAGE_COUNT_VISIT', true),
];
