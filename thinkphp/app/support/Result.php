<?php
/**
 * 统一响应体（对标 Spring Boot 的 Result / PageResult）。
 * 所有接口（含异常）都返回五字段：
 * {"code":200,"success":true,"message":"操作成功","data":{},"timestamp":1720000000000}
 */

namespace app\support;

use think\Response;

class Result
{
    public static function success(mixed $data = null, ?string $message = null): Response
    {
        return json([
            'code' => ResultCode::SUCCESS,
            'success' => true,
            'message' => $message ?? ResultCode::message(ResultCode::SUCCESS),
            'data' => $data,
            'timestamp' => self::now(),
        ]);
    }

    public static function error(int $code = ResultCode::BUSINESS_ERROR, ?string $message = null): Response
    {
        // HTTP 状态码与业务码对应（不再恒 200）；json() 第二个参数即 HTTP 状态码
        return json([
            'code' => $code,
            'success' => false,
            'message' => $message ?? ResultCode::message($code),
            'data' => null,
            'timestamp' => self::now(),
        ], ResultCode::status($code));
    }

    /**
     * 分页载体（对标 PageResult）。
     */
    public static function page(int $pageNum, int $pageSize, int $total, array $records): array
    {
        return [
            'pageNum' => $pageNum,
            'pageSize' => $pageSize,
            'total' => $total,
            'pages' => $pageSize > 0 ? (int) ceil($total / $pageSize) : 0,
            'records' => $records,
        ];
    }

    private static function now(): int
    {
        return (int) (microtime(true) * 1000);
    }
}
