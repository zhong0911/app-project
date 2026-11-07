<?php
/**
 * 角色示例接口（对标 Spring Boot 的 controller/SecurityDemoController）。
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DemoController extends Controller
{
    public function adminOnly(Request $request): JsonResponse
    {
        $name = $request->attributes->get('principal')?->name;
        return Result::success("你好，管理员 {$name}");
    }

    public function anyLoginUser(Request $request): JsonResponse
    {
        $name = $request->attributes->get('principal')?->name;
        return Result::success("你好，{$name}");
    }
}
