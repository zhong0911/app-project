<?php
/**
 * SSO 登录入口（对标 Spring Boot 的 controller/OAuth2LoginController）。
 * 路径全后端统一：GET /sso/authorize、GET /sso/callback
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SsoClient;
use App\Services\UserService;
use App\Support\BusinessException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SsoController extends Controller
{
    public function __construct(
        private readonly SsoClient $ssoClient,
        private readonly UserService $userService,
    ) {
    }

    /** 302 跳 SSO 登录页（带 state，存会话供回调校验） */
    public function authorize(Request $request): RedirectResponse
    {
        $state = $this->ssoClient->newState();
        $request->session()->put('sso_state', $state);

        return redirect()->away($this->ssoClient->buildAuthorizeUrl($state), 302);
    }

    /** 回调：换 token → 取用户信息 → 写会话 → 注册默认用户 → 跳成功页 */
    public function callback(Request $request): RedirectResponse
    {
        $code = (string) $request->query('code', '');
        $state = (string) $request->query('state', '');
        $expected = $request->session()->pull('sso_state');

        if ($code === '' || $state === '' || $state !== $expected) {
            throw BusinessException::badRequest('state 校验失败，请重新登录');
        }

        $token = $this->ssoClient->exchangeCode($code);
        $accessToken = $token['access_token'] ?? '';
        if ($accessToken === '') {
            throw BusinessException::unauthorized('SSO 未返回 access_token');
        }

        $userInfo = $this->ssoClient->fetchUserInfo($accessToken);
        if (! isset($userInfo['sub'])) {
            throw BusinessException::unauthorized('SSO 未返回用户标识 sub');
        }

        $uid = (string) $userInfo['sub'];
        $name = $userInfo['preferred_username'] ?? $userInfo['name'] ?? $uid;

        // 身份 + token 全部留在服务端会话，前端只拿 Cookie
        $request->session()->put([
            'uid' => $uid,
            'name' => $name,
            'access_token' => $accessToken,
            'refresh_token' => $token['refresh_token'] ?? null,
        ]);

        // 新用户默认注册为 USER
        $this->userService->getOrCreateDefaultUser($uid);

        return redirect()->away(config('sso.login_success_url'), 302);
    }
}
