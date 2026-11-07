<?php
/**
 * 认证接口（对标 Spring Boot 的 controller/AuthController）。
 * GET /api/auth/me、POST /api/auth/logout
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SsoClient;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly SsoClient $ssoClient)
    {
    }

    public function me(Request $request): JsonResponse
    {
        $principal = $request->attributes->get('principal');
        if ($principal === null || ! $principal->isLoggedIn()) {
            return Result::success([]);
        }

        $data = ['authenticated' => true];

        if ($principal->authType === 'sso-jwt') {
            $data['type'] = 'sso-jwt';
            $data['subject'] = $principal->uid;
            $data['claims'] = $principal->claims;
        } elseif ($principal->authType === 'sso-login') {
            $data['type'] = 'sso-login';
            $data['clientRegistrationId'] = 'sso';
            $data['name'] = $principal->name;
            $data['attributes'] = ['sub' => $principal->uid, 'preferred_username' => $principal->name];
        } else {
            $data['type'] = 'basic';
            $data['name'] = $principal->name;
        }

        return Result::success($data);
    }

    public function logout(Request $request): JsonResponse
    {
        // 1) 优先撤销 refresh_token，没有则撤销 access_token（失败不阻塞退出）
        $refreshToken = $request->session()->get('refresh_token');
        $accessToken = $request->session()->get('access_token');
        if (! empty($refreshToken)) {
            $this->ssoClient->revokeToken($refreshToken, 'refresh_token');
        } elseif (! empty($accessToken)) {
            $this->ssoClient->revokeToken($accessToken, 'access_token');
        }

        // 2) 销毁本地会话
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // 3) 返回 SSO 登出地址（前端整页跳转完成全局退出）
        return Result::success([
            'ssoLogoutUrl' => config('sso.logout_uri') ?: null,
        ]);
    }
}
