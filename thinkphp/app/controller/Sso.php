<?php
/**
 * SSO 登录入口（对标 Spring Boot 的 controller/OAuth2LoginController）。
 * 路径全后端统一：GET /sso/authorize、GET /sso/callback
 */

namespace app\controller;

use app\BaseController;
use app\service\SsoClient;
use app\service\UserService;
use app\support\BusinessException;
use app\support\RedirectUri;
use think\facade\Session;

class Sso extends BaseController
{
    /**
     * 302 跳 SSO 登录页（带 state，存会话供回调校验）。
     * 可带 ?redirect_uri=/xxx（前端回跳地址）：校验后存会话，回调成功后直接跳过去。
     */
    public function authorize()
    {
        $state = (new SsoClient())->newState();
        Session::set('sso_state', $state);

        // 回跳地址与 state 同会话保存，回调成功时消费一次
        $rawRedirect = $this->request->get('redirect_uri', '');
        $target = is_string($rawRedirect) ? RedirectUri::sanitize($rawRedirect) : null;
        if ($target !== null) {
            Session::set('sso_redirect_uri', $target);
        } else {
            Session::delete('sso_redirect_uri');
        }

        return redirect((new SsoClient())->buildAuthorizeUrl($state));
    }

    /** 回调：换 token → 取用户信息 → 写会话 → 注册默认用户 → 跳成功页 */
    public function callback()
    {
        $code = (string) $this->request->get('code', '');
        $state = (string) $this->request->get('state', '');
        $expected = (string) Session::get('sso_state');
        Session::delete('sso_state');

        if ($code === '' || $state === '' || $state !== $expected) {
            throw BusinessException::badRequest('state 校验失败，请重新登录');
        }

        $client = new SsoClient();
        $token = $client->exchangeCode($code);
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            throw BusinessException::unauthorized('SSO 未返回 access_token');
        }

        $userInfo = $client->fetchUserInfo($accessToken);
        if (! isset($userInfo['sub'])) {
            throw BusinessException::unauthorized('SSO 未返回用户标识 sub');
        }

        $uid = (string) $userInfo['sub'];
        $name = (string) ($userInfo['preferred_username'] ?? $userInfo['name'] ?? $uid);

        // 身份 + token 全部留在服务端会话，前端只拿 Cookie
        Session::set('uid', $uid);
        Session::set('name', $name);
        Session::set('access_token', $accessToken);
        Session::set('refresh_token', $token['refresh_token'] ?? null);

        // 新用户默认注册为 USER
        (new UserService())->getOrCreateDefaultUser($uid);

        // 优先跳前端透传的回跳地址，否则用配置的兜底地址
        $redirectUri = (string) Session::get('sso_redirect_uri');
        Session::delete('sso_redirect_uri');

        return redirect($redirectUri !== '' ? $redirectUri : config('sso.login_success_url'));
    }
}
