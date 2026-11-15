<?php
/**
 * 路由（对标 Spring Boot 的 @RequestMapping 绑定）。
 * 路径全后端统一：/sso/*、/api/*
 */

use think\facade\Route;

// ---- SSO 登录入口（需 Session） ----
Route::get('sso/authorize', 'Sso/authorize');
Route::get('sso/callback', 'Sso/callback');

// ---- API ----
Route::group('api', function () {
    // 认证（内部自行判断登录态）
    Route::get('auth/me', 'Auth/me');
    Route::post('auth/logout', 'Auth/logout');

    // BFF 聚合
    Route::get('bff/me', 'Bff/me');

    // 用户（需登录）
    Route::group(function () {
        Route::get('users', 'User/page');
        Route::post('users', 'User/create');
        Route::put('users', 'User/update');
        Route::get('users/:id', 'User/detail');
        Route::delete('users/:id', 'User/remove');
    })->middleware('sso.auth');

    // 管理端（需管理员）
    Route::group(function () {
        Route::get('admin/roles', 'AdminRole/list');
        Route::post('admin/roles', 'AdminRole/create');
        Route::put('admin/roles/:id', 'AdminRole/update');
        Route::delete('admin/roles/:id', 'AdminRole/remove');
        Route::get('admin/users', 'AdminUser/page');
        Route::get('admin/users/recycle', 'AdminUser/recycle');
        Route::post('admin/users', 'AdminUser/create');
        Route::put('admin/users/:id/status', 'AdminUser/updateStatus');
        Route::delete('admin/users/:id', 'AdminUser/remove');
        Route::post('admin/users/:id/restore', 'AdminUser/restore');
        Route::delete('admin/users/:id/purge', 'AdminUser/purge');
    })->middleware('sso.admin');

    // 权限示例
    Route::get('demo/admin', 'Demo/adminOnly')->middleware('sso.admin');
    Route::get('demo/user', 'Demo/anyLoginUser')->middleware('sso.auth');
})->middleware('sso.identity');
