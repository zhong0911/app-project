<?php
/**
 * 文件系统配置：模板只保留本地私有目录与可公开访问目录。
 * 需要对象存储时自行追加 s3 磁盘（composer require league/flysystem-aws-s3-v3 "^3.0"）。
 */
return [
    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [
        // 框架默认私有目录（业务临时文件）
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
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],
];
