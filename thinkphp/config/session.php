<?php
/**
 * 会话配置：SSO token 存服务端会话，前端只拿 Cookie。
 */
return [
    'type' => env('SESSION_TYPE', 'file'),
    'store' => env('SESSION_STORE'),
    'expire' => (int) env('SESSION_MAX_AGE', 1800),
    'prefix' => env('SESSION_PREFIX', 'antx'),
    'name' => env('SESSION_COOKIE_NAME', 'SESSION'),
    'var_session_id' => '',
    'secure' => (bool) env('SESSION_SECURE_COOKIE', false),
    'httponly' => true,
    'samesite' => 'lax',
];
