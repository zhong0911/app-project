<?php

declare(strict_types=1);

namespace AntX\Template;

/**
 * 全局异常处理器（对标 Spring Boot 模板 GlobalExceptionHandler）。
 *
 * 统一把各类异常转换为 Result 五字段响应，错误也按同一格式返回：
 *   - BusinessException            -> 业务 code + message
 *   - 未捕获的 Throwable / 500      -> INTERNAL_ERROR，不暴露异常信息
 *   - 路由未匹配（404）             -> NOT_FOUND
 */
final class GlobalExceptionHandler
{
    /**
     * 统一处理异常并写出 JSON 响应。
     *
     * @param int   $httpStatus 实际 HTTP 状态码（供前端网络层识别）
     * @param array $body       统一响应体（Result.toArray）
     */
    public static function render(int $httpStatus, array $body): never
    {
        http_response_code($httpStatus);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * 把任意异常归一化为统一响应（供前端控制器 try/catch 调用）。
     *
     * @return array{status:int, body:array}
     */
    public static function resolve(\Throwable $e): array
    {
        if ($e instanceof BusinessException) {
            $code = $e->getErrorCode();
            // 业务码段：HTTP 状态统一用 200（业务错误由 code 表达）；HTTP 语义段保持对应状态
            $http = $code >= 1000 ? 200 : $code;
            return [$http, Result::errorMsg($code, $e->getMessage())->toArray()];
        }

        error_log('[GlobalExceptionHandler] 未捕获异常: ' . $e->getMessage());
        return [500, Result::error(ResultCode::INTERNAL_ERROR)->toArray()];
    }
}
