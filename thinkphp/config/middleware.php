<?php
/**
 * 中间件别名与优先级（对标 Spring Boot 的过滤器链注册）。
 * 全局中间件在 app/middleware.php 中注册。
 */
return [
    'alias' => [
        'sso.identity' => \app\middleware\ResolveIdentity::class,
        'sso.auth' => \app\middleware\Auth::class,
        'sso.admin' => \app\middleware\Admin::class,
    ],
    'priority' => [
        \think\middleware\SessionInit::class,
    ],
];
