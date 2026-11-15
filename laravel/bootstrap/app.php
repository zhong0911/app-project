<?php
/**
 * 应用装配（对标 Spring Boot 的启动类 + 自动配置）。
 * 注册路由、中间件别名、会话，并把异常统一渲染成五字段响应。
 * HTTP 状态码与响应体 code 对应（Result::error 内部按 ResultCode::status 映射）。
 */

use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\AuthenticateSso;
use App\Http\Middleware\ResolveIdentity;
use App\Support\BusinessException;
use App\Support\Result;
use App\Support\ResultCode;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // API 组也需要 Session（SSO 登录态存服务端会话）
        $middleware->api(prepend: [
            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,
            StartSession::class,
        ]);

        // 每个 API 请求解析身份（不拦截）
        $middleware->api(append: [
            ResolveIdentity::class,
        ]);

        $middleware->alias([
            'sso.auth' => AuthenticateSso::class,
            'sso.admin' => EnsureAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // 业务异常
        $exceptions->render(function (BusinessException $e) {
            return Result::error($e->bizCode(), $e->getMessage());
        });

        // 参数校验失败（对应 Spring 的 MethodArgumentNotValidException）
        $exceptions->render(function (ValidationException $e) {
            return Result::error(ResultCode::BAD_REQUEST, implode('；', $e->validator->errors()->all()));
        });

        // 未认证
        $exceptions->render(function (AuthenticationException $e) {
            return Result::error(ResultCode::UNAUTHORIZED);
        });

        // 404 / 405
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            return $request->is('api/*') || $request->is('sso/*')
                ? Result::error(ResultCode::NOT_FOUND)
                : null;
        });
        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) {
            return $request->is('api/*') || $request->is('sso/*')
                ? Result::error(ResultCode::METHOD_NOT_ALLOWED)
                : null;
        });

        // 兜底：未知异常（不把堆栈暴露给前端）
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->is('sso/*')) {
                report($e);
                return Result::error(ResultCode::INTERNAL_ERROR);
            }
            return null;
        });
    })->create();
