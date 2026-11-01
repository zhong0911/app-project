<?php

declare(strict_types=1);

namespace AntX\Template;

/**
 * 统一响应体（对标 Spring Boot 模板 Result）。
 *
 * 五字段：
 * {
 *   "code":      200,
 *   "success":   true,
 *   "message":   "操作成功",
 *   "data":      {...},
 *   "timestamp": 1720000000000     // 毫秒
 * }
 *
 * 说明：data 为 null 时按 Java @JsonInclude(NON_NULL) 语义从 JSON 中省略。
 */
final class ApiResponse
{
    public int $code;
    public bool $success;
    public string $message;
    public mixed $data;
    public int $timestamp;

    private function __construct(int $code, bool $success, string $message, mixed $data)
    {
        $this->code = $code;
        $this->success = $success;
        $this->message = $message;
        $this->data = $data;
        $this->timestamp = (int) round(microtime(true) * 1000);
    }

    /** 成功（无数据） */
    public static function success(): self
    {
        return new self(ResultCode::SUCCESS, true, ResultCode::message(ResultCode::SUCCESS), null);
    }

    /** 成功（带数据） */
    public static function successWith(mixed $data): self
    {
        return new self(ResultCode::SUCCESS, true, ResultCode::message(ResultCode::SUCCESS), $data);
    }

    /** 成功（自定义提示 + 数据） */
    public static function successMsg(string $message, mixed $data): self
    {
        return new self(ResultCode::SUCCESS, true, $message, $data);
    }

    /** 失败（按状态码，使用默认提示语） */
    public static function error(int $code): self
    {
        return new self($code, false, ResultCode::message($code), null);
    }

    /** 失败（按状态码 + 自定义提示） */
    public static function errorMsg(int $code, string $message): self
    {
        return new self($code, false, $message, null);
    }

    /**
     * 序列化为数组。
     * data 为 null 时省略（对标 @JsonInclude(NON_NULL)），其余字段固定五字段。
     */
    public function toArray(): array
    {
        $payload = [
            'code' => $this->code,
            'success' => $this->success,
            'message' => $this->message,
            'timestamp' => $this->timestamp,
        ];
        if ($this->data !== null) {
            $payload['data'] = $this->data;
        }
        return $payload;
    }
}
