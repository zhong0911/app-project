<?php

declare(strict_types=1);

namespace AntX\Template;

/**
 * 统一响应状态码（对标 Spring Boot 模板 ResultCode）。
 *
 * 分段设计：
 *   - 0xx ~ 5xx：HTTP 语义段（200 成功 / 400 参数 / 401 未认证 / 403 无权限 / 404 不存在 / 405 方法不支持 / 500 内部错误）
 *   - 1000+   ：业务码段，按模块递增，避免与 HTTP 状态码混淆
 */
final class ResultCode
{
    // ---- HTTP 语义段 ----
    public const SUCCESS = 200;
    public const BAD_REQUEST = 400;
    public const UNAUTHORIZED = 401;
    public const FORBIDDEN = 403;
    public const NOT_FOUND = 404;
    public const METHOD_NOT_ALLOWED = 405;
    public const INTERNAL_ERROR = 500;

    // ---- 业务码段（1000 起，按模块递增） ----
    public const BUSINESS_ERROR = 1000;   // 业务异常（默认）
    public const DATA_CONFLICT = 1001;    // 数据冲突（唯一性 / 状态冲突）
    public const DB_ERROR = 1002;         // 数据库操作失败
    public const FILE_ERROR = 1003;       // 文件操作失败

    /** code -> 默认提示语（对标 Java 枚举的 message 字段） */
    private const MESSAGES = [
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
    ];

    /** 获取默认提示语，未登记时返回空串（由调用方兜底） */
    public static function message(int $code): string
    {
        return self::MESSAGES[$code] ?? '';
    }
}
