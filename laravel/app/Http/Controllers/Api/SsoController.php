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
use App\Support\RedirectUri;
use App\Support\UserIdentity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SsoController extends Controller
{
    public function __construct(
        private readonly SsoClient $ssoClient,
        private readonly UserService $userService,
    ) {
    }

    /**
     * 302 跳 SSO 登录页（带 state，存会话供回调校验）。
     * 可带 ?redirect_uri=/xxx（前端回跳地址）：校验后存会话，回调成功后直接跳过去。
     */
    public function authorize(Request $request): RedirectResponse
    {
        $state = $this->ssoClient->newState();
        $request->session()->put('sso_state', $state);

        // 回跳地址与 state 同会话保存，回调成功时消费一次
        // 传当前请求源进去，让「同源但不在 CORS 白名单」的地址也能通过校验
        $rawRedirect = $request->query('redirect_uri');
        $target = is_string($rawRedirect)
            ? RedirectUri::sanitize($rawRedirect, $request->getSchemeAndHttpHost())
            : null;
        if ($target !== null) {
            $request->session()->put('sso_redirect_uri', $target);
        } else {
            $request->session()->forget('sso_redirect_uri');
        }

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

        // sub 是用户唯一标识：SSO 应用可配置成 uid（整数）/ username / email / phone，
        // 统一规范化成字符串再写入会话与本地表
        $uid = UserIdentity::orEmpty($userInfo['sub'] ?? null);
        if ($uid === '') {
            throw BusinessException::unauthorized('SSO 未返回用户标识 sub');
        }

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

        // 优先跳前端透传的回跳地址，否则用配置的兜底地址
        $redirectUri = $request->session()->pull('sso_redirect_uri');

        return redirect()->away($redirectUri ?: config('sso.login_success_url'), 302);
    }
}
