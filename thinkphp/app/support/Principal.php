<?php
/**
 * 当前登录身份（对标 Spring Boot 的 Authentication）。
 */

namespace app\support;

class Principal
{
    public function __construct(
        public readonly ?string $uid = null,
        public readonly ?string $name = null,
        public readonly string $authType = 'anonymous',
        public readonly array $claims = [],
    ) {
    }

    public static function anonymous(): self
    {
        return new self();
    }

    public function isLoggedIn(): bool
    {
        return $this->uid !== null && $this->uid !== '';
    }
}
