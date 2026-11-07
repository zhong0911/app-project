<?php
/**
 * 管理员校验中间件（对标 Spring Boot 的 CurrentUserService#requireAdmin）。
 * 未登录 401，非管理员 403，被禁用 403。
 */

namespace App\Http\Middleware;

use App\Services\UserService;
use App\Support\BusinessException;
use App\Support\Principal;
use Closure;
use Illuminate\Http\Request;

class EnsureAdmin
{
    public function __construct(private readonly UserService $userService)
    {
    }

    public function handle(Request $request, Closure $next)
    {
        /** @var Principal|null $principal */
        $principal = $request->attributes->get('principal');
        if ($principal === null || ! $principal->isLoggedIn()) {
            throw BusinessException::unauthorized();
        }
        $this->userService->requireAdmin((string) $principal->uid);

        return $next($request);
    }
}
