<?php

declare(strict_types=1);

namespace AntX\Template;

/**
 * 当前 SSO 用户身份解析 + 管理员判定。
 *
 * 用户唯一标识为 access_token 的 sub（SSO uid）；管理员 uid 由 SSO_ADMIN_UID 配置，默认 1。
 */
final class Security
{
    /** 确保会话已启动（只读登录态） */
    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    /** 从 JWT access_token 解析 sub（不验签，token 由本应用从 SSO token 端点获取） */
    public static function decodeSub(?string $token): ?string
    {
        if ($token === null || $token === '' || substr_count($token, '.') !== 2) {
            return null;
        }
        $parts = explode('.', $token);
        $payload = strtr($parts[1], '-_', '+/');
        $payload .= str_repeat('=', (4 - strlen($payload) % 4) % 4);
        $data = json_decode((string) base64_decode($payload), true);
        if (!is_array($data) || !array_key_exists('sub', $data) || $data['sub'] === null) {
            return null;
        }
        return (string) $data['sub'];
    }

    /** 解析当前登录用户的 SSO uid；未登录返回 null */
    public static function currentUid(): ?string
    {
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (is_string($auth) && stripos($auth, 'bearer ') === 0) {
            return self::decodeSub(trim(substr($auth, 7)));
        }
        self::startSession();
        $tokens = $_SESSION['oauth2_tokens'] ?? null;
        if (!is_array($tokens)) {
            return null;
        }
        if (!empty($tokens['uid'])) {
            return (string) $tokens['uid'];
        }
        return self::decodeSub($tokens['access_token'] ?? null);
    }

    public static function adminUid(): string
    {
        return getenv('SSO_ADMIN_UID') ?: '1';
    }

    public static function isAdmin(?string $uid): bool
    {
        return $uid !== null && $uid !== '' && $uid === self::adminUid();
    }

    /**
     * 管理接口鉴权：未登录 401，非管理员 403，被禁用的管理员 403。
     *
     * @return string 当前管理员 uid
     */
    public static function requireAdmin(): string
    {
        $uid = self::currentUid();
        if ($uid === null) {
            throw new BusinessException(ResultCode::UNAUTHORIZED, '未登录或登录已过期');
        }
        if (!self::isAdmin($uid)) {
            throw new BusinessException(ResultCode::FORBIDDEN, '仅管理员可访问');
        }
        $local = (new UserRepository())->getByUid($uid);
        if ($local !== null && (int) $local['status'] === 0) {
            throw new BusinessException(ResultCode::FORBIDDEN, '账号已被禁用');
        }
        return $uid;
    }
}
