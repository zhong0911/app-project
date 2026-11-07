<?php
/**
 * 认证接口（对标 Spring Boot 的 controller/AuthController）。
 * GET /api/auth/me、POST /api/auth/logout
 */

namespace app\controller;

use app\BaseController;
use app\service\SsoClient;
use app\support\Result;
use think\facade\Session;

class Auth extends BaseController
{
    public function me()
    {
        $principal = $this->request->principal;
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

    public function logout()
    {
        $client = new SsoClient();

        // 1) 优先撤销 refresh_token，没有则撤销 access_token（失败不阻塞退出）
        $refreshToken = Session::get('refresh_token');
        $accessToken = Session::get('access_token');
        if (! empty($refreshToken)) {
            $client->revokeToken($refreshToken, 'refresh_token');
        } elseif (! empty($accessToken)) {
            $client->revokeToken($accessToken, 'access_token');
        }

        // 2) 销毁本地会话
        Session::clear();

        // 3) 返回 SSO 登出地址（前端整页跳转完成全局退出）
        return Result::success([
            'ssoLogoutUrl' => config('sso.logout_uri') ?: null,
        ]);
    }
}
