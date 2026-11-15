<?php
/**
 * 统一状态码（对标 Spring Boot 的 common/enums/ResultCode）。
 */

namespace app\support;

class ResultCode
{
    public const SUCCESS = 200;
    public const BAD_REQUEST = 400;
    public const UNAUTHORIZED = 401;
    public const FORBIDDEN = 403;
    public const NOT_FOUND = 404;
    public const METHOD_NOT_ALLOWED = 405;
    public const INTERNAL_ERROR = 500;
    public const BUSINESS_ERROR = 1000;
    public const DATA_CONFLICT = 1001;
    public const DB_ERROR = 1002;
    public const FILE_ERROR = 1003;

    /**
     * 业务码 → HTTP 状态码（与各语言模板保持一致）
     * BUSINESS_ERROR(1000)→400、DATA_CONFLICT(1001)→409、DB_ERROR/FILE_ERROR→500
     */
    public static function status(int $code): int
    {
        return match ($code) {
            self::SUCCESS => 200,
            self::BAD_REQUEST => 400,
            self::UNAUTHORIZED => 401,
            self::FORBIDDEN => 403,
            self::NOT_FOUND => 404,
            self::METHOD_NOT_ALLOWED => 405,
            self::INTERNAL_ERROR => 500,
            self::BUSINESS_ERROR => 400,
            self::DATA_CONFLICT => 409,
            self::DB_ERROR, self::FILE_ERROR => 500,
            default => $code >= 400 && $code < 600 ? $code : 500,
        };
    }

    public static function message(int $code): string
    {
        return match ($code) {
            self::SUCCESS => '操作成功',
            self::BAD_REQUEST => '请求参数错误',
            self::UNAUTHORIZED => '未登录或登录已过期',
            self::FORBIDDEN => '无访问权限',
            self::NOT_FOUND => '请求资源不存在',
            self::METHOD_NOT_ALLOWED => '请求方法不支持',
            self::INTERNAL_ERROR => '服务器内部错误',
            self::BUSINESS_ERROR => '业务处理失败',
            self::DATA_CONFLICT => '数据冲突',
            self::DB_ERROR => '数据库操作失败',
            self::FILE_ERROR => '文件操作失败',
            default => '业务处理失败',
        };
    }
}
