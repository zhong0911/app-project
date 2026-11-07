<?php
/**
 * 登录回跳地址校验（防开放重定向）。
 *
 * 前端访问 /sso/authorize 时用 redirect_uri 透传要回跳的页面地址，后端存会话、
 * 回调成功后 302 过去。规则：
 * 1. 站内相对路径（单个 / 开头）：放行，浏览器按当前页面源解析；
 * 2. 绝对 http(s) 地址：origin 必须命中 CORS 允许来源白名单（前端传的就是这种，前后端分域也一致）；
 * 3. 协议相对（//evil.com）、反斜杠变体（/\evil.com）、控制字符、超长地址：判非法。
 *
 * 非法返回 null，由调用方回退 config('sso.login_success_url')。
 */

namespace App\Support;

class RedirectUri
{
    /** 回跳地址最大长度（浏览器与各类代理的兼容上限） */
    private const MAX_LENGTH = 2048;

    public static function sanitize(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        $target = trim($raw);
        if ($target === '' || strlen($target) > self::MAX_LENGTH) {
            return null;
        }
        // 控制字符（含换行）会污染响应头
        if (preg_match('/[\x00-\x1f\x7f]/', $target) === 1) {
            return null;
        }
        if (str_starts_with($target, '/')) {
            if (str_starts_with($target, '//') || str_starts_with($target, '/\\')) {
                return null;
            }
            return $target;
        }
        if (preg_match('#^https?://#i', $target) !== 1) {
            return null;
        }
        $origin = self::originOf($target);
        if ($origin === null) {
            return null;
        }
        foreach ((array) config('cors.allowed_origins', []) as $allowed) {
            if (is_string($allowed) && self::originOf($allowed) === $origin) {
                return $target;
            }
        }

        return null;
    }

    /** 提取 origin（scheme://host[:port]，默认端口省略）；非法地址返回 null */
    private static function originOf(string $url): ?string
    {
        $parts = parse_url(trim($url));
        if ($parts === false || empty($parts['scheme']) || empty($parts['host'])) {
            return null;
        }
        $scheme = strtolower($parts['scheme']);
        if ($scheme !== 'http' && $scheme !== 'https') {
            return null;
        }
        $host = strtolower($parts['host']);
        $port = $parts['port'] ?? null;
        $defaultPort = ($scheme === 'http' && ($port === null || $port === 80))
            || ($scheme === 'https' && ($port === null || $port === 443));

        return $defaultPort ? "{$scheme}://{$host}" : "{$scheme}://{$host}:{$port}";
    }
}
