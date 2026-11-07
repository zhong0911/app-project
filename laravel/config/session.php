<?php
/**
 * 会话配置：SSO token 存服务端会话，前端只拿 Cookie。
 * 多实例部署请把 driver 换成 redis。
 */
return [
    'driver' => env('SESSION_DRIVER', 'file'),
    'lifetime' => (int) env('SESSION_MAX_AGE', 1800),
    'expire_on_close' => false,
    'encrypt' => false,
    'files' => storage_path('framework/sessions'),
    'connection' => env('SESSION_CONNECTION'),
    'table' => 'sessions',
    'store' => env('SESSION_STORE'),
    'cookie' => env('SESSION_COOKIE_NAME', 'SESSION'),
    'path' => '/',
    'domain' => env('SESSION_DOMAIN'),
    'secure' => env('SESSION_SECURE_COOKIE', false),
    'http_only' => true,
    'same_site' => 'lax',
];
