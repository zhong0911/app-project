<?php
/**
 * 身份解析中间件（对标 Spring Boot 的 Security 过滤器链）。
 * 把 Principal 挂到请求对象，本身不拦截。
 */

namespace app\middleware;

use app\service\SsoClient;
use app\support\BusinessException;
use app\support\Principal;
use Closure;
use think\facade\Session;
use think\Request;

class ResolveIdentity
{
    public function handle(Request $request, Closure $next)
    {
        $request->principal = $this->resolve($request);
        return $next($request);
    }

    private function resolve(Request $request): Principal
    {
        // 1) SSO 浏览器登录：会话里存了 uid
        $sessionUid = Session::get('uid');
        if (! empty($sessionUid)) {
            return new Principal(
                uid: (string) $sessionUid,
                name: Session::get('name'),
                authType: 'sso-login',
            );
        }

        $authorization = (string) $request->header('authorization', '');

        // 2) Bearer Token
        if (stripos($authorization, 'bearer ') === 0) {
            try {
                $claims = (new SsoClient())->verifyToken(trim(substr($authorization, 7)));
            } catch (BusinessException) {
                return new Principal(authType: 'invalid');
            }
            $uid = isset($claims['sub']) ? (string) $claims['sub'] : null;
            $name = $claims['preferred_username'] ?? $claims['name'] ?? $uid;
            return new Principal(uid: $uid, name: $name, authType: 'sso-jwt', claims: $claims);
        }

        // 3) 本地联调 Basic
        if (stripos($authorization, 'basic ') === 0 && config('sso.basic_enabled')) {
            $decoded = base64_decode(substr($authorization, 6), true);
            if ($decoded !== false) {
                [$username, $password] = array_pad(explode(':', $decoded, 2), 2, '');
                if ($username === config('sso.basic_username') && $password === config('sso.basic_password')) {
                    return new Principal(uid: $username, name: $username, authType: 'basic');
                }
            }
            return new Principal(authType: 'invalid');
        }

        return Principal::anonymous();
    }
}
