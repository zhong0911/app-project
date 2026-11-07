<?php
/**
 * 登录校验中间件（对标 Spring 的 anyRequest().authenticated()）。
 */

namespace App\Http\Middleware;

use App\Support\BusinessException;
use App\Support\Principal;
use Closure;
use Illuminate\Http\Request;

class AuthenticateSso
{
    public function handle(Request $request, Closure $next)
    {
        /** @var Principal|null $principal */
        $principal = $request->attributes->get('principal');
        if ($principal === null || ! $principal->isLoggedIn()) {
            throw BusinessException::unauthorized();
        }
        return $next($request);
    }
}
