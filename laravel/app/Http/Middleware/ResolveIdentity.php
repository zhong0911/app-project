<?php
/**
 * 身份解析中间件（对标 Spring Boot 的 Security 过滤器链）。
 * 把 Principal 挂到 request 与容器，本身不拦截。
 */

namespace App\Http\Middleware;

use App\Services\SsoClient;
use App\Support\BusinessException;
use App\Support\Principal;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ResolveIdentity
{
    public function __construct(private readonly SsoClient $ssoClient)
    {
    }

    public function handle(Request $request, Closure $next)
    {
        $principal = $this->resolve($request);
        $request->attributes->set('principal', $principal);
        app()->instance('principal', $principal);

        return $next($request);
    }

    private function resolve(Request $request): Principal
    {
        // 1) SSO 浏览器登录：会话里存了 uid
        if ($request->hasSession() && $request->session()->has('uid')) {
            return new Principal(
                uid: (string) $request->session()->get('uid'),
                name: $request->session()->get('name'),
                authType: 'sso-login',
            );
        }

        $authorization = (string) $request->header('Authorization');

        // 2) Bearer Token
        if (stripos($authorization, 'bearer ') === 0) {
            try {
                $claims = $this->ssoClient->verifyToken(trim(substr($authorization, 7)));
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
