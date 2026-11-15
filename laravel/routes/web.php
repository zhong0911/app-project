<?php
/**
 * SSO 登录入口（对标 Spring Boot 的 OAuth2LoginController）。
 * 放在 web 组：需要 Session 与 Cookie（路径全后端统一 /sso/*）。
 */

use App\Http\Controllers\Api\SsoController;
use Illuminate\Support\Facades\Route;

Route::get('/sso/authorize', [SsoController::class, 'authorize']);
Route::get('/sso/callback', [SsoController::class, 'callback']);

/*
 * 兼容已在 SSO 控制台登记的回调地址：http://localhost:3000/oss/callback
 * 前端 dev server 把 /oss 代理到本服务，因此回调经代理后落到这里。
 */
Route::get('/oss/authorize', [SsoController::class, 'authorize']);
Route::get('/oss/callback', [SsoController::class, 'callback']);
