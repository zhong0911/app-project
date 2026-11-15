<?php
/**
 * 全局异常渲染（对标 Spring Boot 的 GlobalExceptionHandler）。
 * HTTP 状态码与响应体 code 对应（Result::error 内部按 ResultCode::status 映射）：
 * 400/401/403/404/405/500 直接沿用，BUSINESS_ERROR(1000)→400、DATA_CONFLICT(1001)→409。
 */

namespace app;

use app\support\BusinessException;
use app\support\Result;
use app\support\ResultCode;
use think\exception\Handle;
use think\exception\ValidateException;
use think\Response;
use Throwable;

class ExceptionHandle extends Handle
{
    public function render($request, Throwable $e): Response
    {
        // 业务异常
        if ($e instanceof BusinessException) {
            return Result::error($e->bizCode(), $e->getMessage());
        }

        // 参数校验失败（对应 Spring 的 MethodArgumentNotValidException）
        if ($e instanceof ValidateException) {
            return Result::error(ResultCode::BAD_REQUEST, $e->getMessage());
        }

        // 路由 / 方法不存在
        if ($e instanceof \think\exception\HttpException) {
            $code = $e->getStatusCode();
            return Result::error(match ($code) {
                404 => ResultCode::NOT_FOUND,
                405 => ResultCode::METHOD_NOT_ALLOWED,
                401 => ResultCode::UNAUTHORIZED,
                403 => ResultCode::FORBIDDEN,
                default => ResultCode::BUSINESS_ERROR,
            }, $e->getMessage());
        }

        // 兜底：未知异常（不把堆栈暴露给前端）
        $this->report($e);
        return Result::error(ResultCode::INTERNAL_ERROR);
    }
}
