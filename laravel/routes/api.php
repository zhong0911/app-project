<?php
/**
 * API 路由（对标 Spring Boot 的 @RequestMapping）。
 * 统一前缀 /api（见 bootstrap/app.php 的 withRouting(api:)）。
 */

use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BffController;
use App\Http\Controllers\Api\DemoController;
use App\Http\Controllers\Api\ImageController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// 认证（内部自行判断登录态）
Route::get('/auth/me', [AuthController::class, 'me']);
Route::post('/auth/logout', [AuthController::class, 'logout']);

// BFF 聚合
Route::get('/bff/me', [BffController::class, 'me']);

// 用户（需登录）
Route::middleware('sso.auth')->group(function () {
    Route::get('/users', [UserController::class, 'page']);
    Route::post('/users', [UserController::class, 'create']);
    Route::put('/users', [UserController::class, 'update']);
    Route::get('/users/{id}', [UserController::class, 'detail'])->whereNumber('id');
    Route::delete('/users/{id}', [UserController::class, 'remove'])->whereNumber('id');
});

// 管理端（需管理员）
Route::middleware('sso.admin')->group(function () {
    Route::get('/admin/users', [AdminUserController::class, 'page']);
    Route::get('/admin/users/recycle', [AdminUserController::class, 'recycle']);
    Route::post('/admin/users', [AdminUserController::class, 'create']);
    Route::put('/admin/users/{id}/status', [AdminUserController::class, 'updateStatus'])->whereNumber('id');
    Route::delete('/admin/users/{id}', [AdminUserController::class, 'remove'])->whereNumber('id');
    Route::post('/admin/users/{id}/restore', [AdminUserController::class, 'restore'])->whereNumber('id');
    Route::delete('/admin/users/{id}/purge', [AdminUserController::class, 'purge'])->whereNumber('id');
});

// 权限示例
Route::get('/demo/user', [DemoController::class, 'anyLoginUser'])->middleware('sso.auth');
Route::get('/demo/admin', [DemoController::class, 'adminOnly'])->middleware('sso.admin');

// 图床（需登录；图片本体走公开路由 /i/{uuid}，见 routes/image.php）
Route::middleware('sso.auth')->prefix('image')->group(function () {
    Route::post('/', [ImageController::class, 'upload']);
    Route::get('/', [ImageController::class, 'page']);
    Route::get('/recycle', [ImageController::class, 'recycle']);
    Route::delete('/{uuid}', [ImageController::class, 'remove'])->where('uuid', '[0-9a-fA-F]{32}');
    Route::post('/{uuid}/restore', [ImageController::class, 'restore'])->where('uuid', '[0-9a-fA-F]{32}');
    Route::delete('/{uuid}/purge', [ImageController::class, 'purge'])->where('uuid', '[0-9a-fA-F]{32}');
});
