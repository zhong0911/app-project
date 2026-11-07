<?php
/**
 * 管理员校验中间件（对标 Spring Boot 的 CurrentUserService#requireAdmin）。
 * 未登录 401，非管理员 403，被禁用 403。
 */

namespace app\middleware;

use app\service\UserService;
use app\support\BusinessException;
use Closure;
use think\Request;

class Admin
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->principal === null || ! $request->principal->isLoggedIn()) {
            throw BusinessException::unauthorized();
        }
        (new UserService())->requireAdmin((string) $request->principal->uid);

        return $next($request);
    }
}
