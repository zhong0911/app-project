<?php
/**
 * SSO 登录入口（对标 Spring Boot 的 OAuth2LoginController）。
 * 放在 web 组：需要 Session 与 Cookie（路径全后端统一 /sso/*）。
 */

use App\Http\Controllers\Api\SsoController;
use Illuminate\Support\Facades\Route;

Route::get('/sso/authorize', [SsoController::class, 'authorize']);
Route::get('/sso/callback', [SsoController::class, 'callback']);
