<?php
/**
 * 应用配置（对标 Spring Boot 的 application.yml）。
 */
return [
    'app_name' => env('APP_NAME', 'thinkphp-template'),
    'app_debug' => (bool) env('APP_DEBUG', true),
    'app_trace' => (bool) env('APP_TRACE', false),
    'show_error_msg' => true,
    'default_timezone' => 'Asia/Shanghai',
    'exception_handle' => \app\ExceptionHandle::class,
    'default_app' => 'index',
];
