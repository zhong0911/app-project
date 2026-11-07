<?php
/**
 * 登录校验中间件（对标 Spring 的 anyRequest().authenticated()）。
 */

namespace app\middleware;

use app\support\BusinessException;
use Closure;
use think\Request;

class Auth
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->principal === null || ! $request->principal->isLoggedIn()) {
            throw BusinessException::unauthorized();
        }
        return $next($request);
    }
}
