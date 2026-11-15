<?php
/**
 * 图片公开访问路由（无鉴权、无会话）：GET /i/{uuid}
 * 前缀取自 config/image.php 的 prefix，由 bootstrap/app.php 的 withRouting(then:) 注册。
 */

use App\Http\Controllers\ImageViewController;
use Illuminate\Support\Facades\Route;

Route::get('/{uuid}', [ImageViewController::class, 'show'])
    ->where('uuid', '[0-9a-fA-F]{32}')
    ->name('image.show');
