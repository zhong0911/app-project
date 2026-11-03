<?php

declare(strict_types=1);

namespace AntX\Template;

/**
 * 业务异常（对标 Spring Boot 模板 BusinessException）。
 *
 * 业务层主动抛出，由全局异常处理器统一捕获并转成统一响应，
 * 避免把异常细节直接暴露给前端。
 */
final class BusinessException extends \RuntimeException
{
    /** 错误码（避免与 Exception::$code 冲突，单独命名） */
    private int $errorCode;

    /** 业务异常（默认 1000） */
    public static function of(string $message): self
    {
        return new self(ResultCode::BUSINESS_ERROR, $message);
    }

    /** 按状态码，使用默认提示语 */
    public static function ofCode(int $code): self
    {
        return new self($code, ResultCode::message($code));
    }

    /** 按状态码 + 自定义提示 */
    public function __construct(int $code, string $message)
    {
        parent::__construct($message);
        $this->errorCode = $code;
    }

    public function getErrorCode(): int
    {
        return $this->errorCode;
    }
}
