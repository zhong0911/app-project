<?php
/**
 * 业务异常（对标 Spring Boot 的 BusinessException）。
 * 业务层 throw，由 bootstrap/app.php 的异常渲染统一转成 Result。
 */

namespace App\Support;

use Exception;

class BusinessException extends Exception
{
    public function __construct(private readonly int $bizCode = ResultCode::BUSINESS_ERROR, ?string $message = null)
    {
        parent::__construct($message ?? ResultCode::message($bizCode), $bizCode);
    }

    /** 业务码（不能复用 Exception::$code，避免属性重复声明） */
    public function bizCode(): int
    {
        return $this->bizCode;
    }

    public static function badRequest(string $message): self
    {
        return new self(ResultCode::BAD_REQUEST, $message);
    }

    public static function unauthorized(?string $message = null): self
    {
        return new self(ResultCode::UNAUTHORIZED, $message);
    }

    public static function forbidden(?string $message = null): self
    {
        return new self(ResultCode::FORBIDDEN, $message);
    }

    public static function notFound(string $message): self
    {
        return new self(ResultCode::NOT_FOUND, $message);
    }

    public static function conflict(string $message): self
    {
        return new self(ResultCode::DATA_CONFLICT, $message);
    }
}
