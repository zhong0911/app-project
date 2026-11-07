<?php
/**
 * 全局中间件（对标 Spring Boot 的 Filter 注册）。
 * 顺序：CORS → 会话初始化 → 路由
 */
return [
    \app\middleware\Cors::class,
    \think\middleware\SessionInit::class,
];
