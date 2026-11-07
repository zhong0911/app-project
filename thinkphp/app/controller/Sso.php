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
use think\facade\Session;

class Sso extends BaseController
{
    /** 302 跳 SSO 登录页（带 state，存会话供回调校验） */
    public function authorize()
    {
        $state = (new SsoClient())->newState();
        Session::set('sso_state', $state);

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

        return redirect(config('sso.login_success_url'));
    }
}
