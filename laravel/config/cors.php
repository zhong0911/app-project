<?php
/**
 * CORS：允许携带会话 Cookie 的来源（生产写具体域名，不能 *）。
 */
return [
    'paths' => ['api/*', 'sso/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173'))
    ))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
