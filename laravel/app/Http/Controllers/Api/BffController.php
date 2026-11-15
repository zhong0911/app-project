<?php
/**
 * BFF 聚合接口（对标 Spring Boot 的 controller/BffController）。
 * GET /api/bff/me —— 一次拿到登录态：SSO 身份 + 本地角色。
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\UserService;
use App\Support\Result;
use App\Support\UserIdentity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BffController extends Controller
{
    public function __construct(private readonly UserService $userService)
    {
    }

    public function me(Request $request): JsonResponse
    {
        $principal = $request->attributes->get('principal');
        if ($principal === null || ! $principal->isLoggedIn()) {
            return Result::success([]);
        }

        // 唯一标识统一成字符串：SSO uid 是整数，前端/接口层一律按字符串处理
        $uid = UserIdentity::orEmpty($principal->uid);
        $data = [
            'authType' => $principal->authType,
            'uid' => $uid,
            'name' => $principal->name,
            'isAdmin' => $this->userService->isAdmin($uid),
        ];

        // 聚合本地角色 / 启停状态（未注册则无角色）
        $local = $this->userService->getByUid($uid);
        if ($local !== null) {
            $data['localId'] = (int) $local->id;
            $data['role'] = $local->role;
            $data['status'] = (int) $local->status;
        }

        return Result::success($data);
    }
}
