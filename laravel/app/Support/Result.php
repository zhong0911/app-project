<?php
/**
 * 统一响应体（对标 Spring Boot 的 Result / PageResult）。
 * 所有接口（含异常）都返回五字段：
 * {"code":200,"success":true,"message":"操作成功","data":{},"timestamp":1720000000000}
 */

namespace App\Support;

use Illuminate\Http\JsonResponse;

class Result
{
    public static function success(mixed $data = null, ?string $message = null): JsonResponse
    {
        return response()->json([
            'code' => ResultCode::SUCCESS,
            'success' => true,
            'message' => $message ?? ResultCode::message(ResultCode::SUCCESS),
            'data' => $data,
            'timestamp' => now()->getTimestampMs(),
        ]);
    }

    public static function error(int $code = ResultCode::BUSINESS_ERROR, ?string $message = null): JsonResponse
    {
        // HTTP 状态码与业务码对应（不再恒 200）
        return response()->json([
            'code' => $code,
            'success' => false,
            'message' => $message ?? ResultCode::message($code),
            'data' => null,
            'timestamp' => now()->getTimestampMs(),
        ], ResultCode::status($code));
    }

    /**
     * 分页载体（对标 PageResult）。
     *
     * @param array<int, mixed> $records
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
}
