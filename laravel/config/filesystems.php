<?php
/**
 * 文件系统配置：图床默认写本地磁盘（storage/app/images），
 * 需要对象存储时把 IMAGE_DISK 切成 s3，并填入 AWS_* 变量（MinIO 需 AWS_USE_PATH_STYLE_ENDPOINT=true）。
 */
return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        // 框架默认私有目录（保留给业务临时文件）
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
        ],

        // 可公开访问目录（php artisan storage:link 后经 /storage 访问）
        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        // 图床默认磁盘：只由控制器按 uuid 读取，不直接映射成静态目录
        'images' => [
            'driver' => 'local',
            'root' => storage_path('app/images'),
            'throw' => true,
        ],

        // 对象存储（AWS S3 / 阿里云 OSS S3 兼容 / MinIO）
        // 需要先执行 composer require league/flysystem-aws-s3-v3 "^3.0"
        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => true,
        ],
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],
];
