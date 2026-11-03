<?php

declare(strict_types=1);

namespace AntX\Template;

/**
 * OAuth2 客户端（授权码模式，对标 Spring Boot 模板 spring.security.oauth2.client）。
 *
 * 规范路径（全后端统一）：
 *   - 跳转到授权服务器：GET /sso/authorize
 *   - 接受授权码     ：GET /sso/callback?code=...&state=...
 *
 * 本模板只接入 AntX SSO，provider 固定为 sso（对标 Spring Security registration "sso"），
 * 配置从环境变量读取（对标 application.yml 的 SSO_*）。
 */
final class OAuth2
{
    /** 构造 provider 注册表（对标 SSO_*）。 */
    public static function providers(): array
    {
        $issuer = rtrim((string) getenv('SSO_ISSUER'), '/');
        $clientId = (string) getenv('SSO_CLIENT_ID');
        if ($clientId === '') {
            return [];
        }
        return [
            'sso' => [
                'name' => 'sso',
                'clientId' => $clientId,
                'clientSecret' => (string) getenv('SSO_CLIENT_SECRET'),
                'authorizationUri' => (string) getenv('SSO_AUTHORIZATION_URI') ?: ($issuer . '/oauth2/authorize'),
                'tokenUri' => (string) getenv('SSO_TOKEN_URI') ?: ($issuer . '/oauth2/token'),
                'userinfoUri' => (string) getenv('SSO_USERINFO_URI') ?: ($issuer ? $issuer . '/userinfo' : ''),
                'revokeUri' => (string) getenv('SSO_REVOKE_URI') ?: ($issuer ? $issuer . '/oauth2/revoke' : ''),
                'scope' => (string) getenv('SSO_SCOPE') ?: 'openid,profile,email,roles,permissions',
                'loginSuccessUrl' => (string) getenv('SSO_LOGIN_SUCCESS_URL') ?: '/',
            ],
        ];
    }

    /** provider 是否已注册。 */
    public static function has(string $provider): bool
    {
        return isset(self::providers()[$provider]);
    }

    /** 构造授权服务器跳转 URL，返回 [url, state]。 */
    public static function authorizeUrl(string $provider, string $baseUrl): array
    {
        $cfg = self::providers()[$provider];
        $state = bin2hex(random_bytes(24));
        $redirectUri = $baseUrl . '/sso/callback';
        $params = http_build_query([
            'response_type' => 'code',
            'client_id' => $cfg['clientId'],
            'redirect_uri' => $redirectUri,
            'scope' => $cfg['scope'],
            'state' => $state,
        ]);
        return [$cfg['authorizationUri'] . '?' . $params, $state];
    }

    /** 用授权码换取 token（POST token 端点）。失败抛 \RuntimeException。 */
    public static function exchangeCode(string $provider, string $code, string $baseUrl): array
    {
        $cfg = self::providers()[$provider];
        $redirectUri = $baseUrl . '/sso/callback';
        $body = http_build_query([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $redirectUri,
            'client_id' => $cfg['clientId'],
            'client_secret' => $cfg['clientSecret'],
        ]);
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\nContent-Length: " . strlen($body) . "\r\n",
                'content' => $body,
                'ignore_errors' => true,
                'timeout' => 15,
            ],
        ]);
        $raw = @file_get_contents($cfg['tokenUri'], false, $context);
        if ($raw === false) {
            throw new \RuntimeException('token 端点不可达');
        }
        $json = json_decode($raw, true);
        if (!is_array($json)) {
            throw new \RuntimeException('token 响应解析失败');
        }
        return $json;
    }

    /**
     * 调用 SSO 的 revoke 端点（RFC 7009）撤销会话中的 token：优先 refresh_token。
     * 撤销失败仅记日志，不阻塞退出流程。
     */
    public static function revokeToken(array $cfg, array $tokens): void
    {
        if (($cfg['revokeUri'] ?? '') === '') {
            return;
        }
        $refresh = $tokens['refresh_token'] ?? null;
        $token = $refresh ?: ($tokens['access_token'] ?? null);
        if (!$token) {
            return;
        }
        $body = http_build_query([
            'token' => $token,
            'token_type_hint' => $refresh ? 'refresh_token' : 'access_token',
            'client_id' => $cfg['clientId'],
            'client_secret' => $cfg['clientSecret'],
        ]);
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\nContent-Length: " . strlen($body) . "\r\n",
                'content' => $body,
                'ignore_errors' => true,
                'timeout' => 10,
            ],
        ]);
        $ok = @file_get_contents($cfg['revokeUri'], false, $context);
        error_log($ok === false
            ? '[SSO] revoke 失败（忽略，不阻塞退出）'
            : '[SSO] revoke 完成');
    }
}
