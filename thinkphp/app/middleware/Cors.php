<?php
/**
 * 跨域中间件（对标 Spring Boot 的 CorsConfiguration）。
 * 允许携带会话 Cookie 的来源必须写具体域名，不能用 *。
 */

namespace app\middleware;

use Closure;
use think\Request;
use think\Response;

class Cors
{
    public function handle(Request $request, Closure $next)
    {
        $origin = (string) $request->header('origin', '');
        $allowed = array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))));

        $response = $next($request);

        if ($origin !== '' && in_array($origin, $allowed, true)) {
            $response->header([
                'Access-Control-Allow-Origin' => $origin,
                'Access-Control-Allow-Credentials' => 'true',
                'Access-Control-Allow-Methods' => 'GET,POST,PUT,DELETE,OPTIONS',
                'Access-Control-Allow-Headers' => 'Authorization,Content-Type,X-Requested-With',
                'Access-Control-Max-Age' => '3600',
                'Vary' => 'Origin',
            ]);
        }

        // 预检请求直接返回 204
        if ($request->method(true) === 'OPTIONS') {
            return Response::create()->code(204);
        }

        return $response;
    }
}
