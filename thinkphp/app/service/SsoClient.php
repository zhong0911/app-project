<?php
/**
 * SSO 客户端（对标 Spring Boot 的 OAuth2 Client）。
 * 授权码登录 + token 换取 + JWKS 验签 + revoke。
 */

namespace app\service;

use app\support\BusinessException;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use think\facade\Cache;

class SsoClient
{
    /** 生成 state（防 CSRF，存会话后回调校验） */
    public function newState(): string
    {
        return bin2hex(random_bytes(24));
    }

    /** 拼装授权跳转地址 */
    public function buildAuthorizeUrl(string $state): string
    {
        $query = http_build_query([
            'response_type' => 'code',
            'client_id' => config('sso.client_id'),
            'redirect_uri' => config('sso.redirect_uri'),
            'scope' => config('sso.scope'),
            'state' => $state,
        ]);

        $base = config('sso.authorization_uri');
        return $base . (str_contains($base, '?') ? '&' : '?') . $query;
    }

    /** 用授权码换 token（client_secret_post） */
    public function exchangeCode(string $code): array
    {
        $response = $this->postForm(config('sso.token_uri'), [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => config('sso.redirect_uri'),
            'client_id' => config('sso.client_id'),
            'client_secret' => config('sso.client_secret'),
        ]);

        if ($response === null) {
            throw BusinessException::unauthorized('SSO 换取 token 失败');
        }
        return $response;
    }

    /** 获取用户资料（sub 即用户 uid） */
    public function fetchUserInfo(string $accessToken): array
    {
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "Authorization: Bearer {$accessToken}\r\n",
                'timeout' => 10,
                'ignore_errors' => true,
            ],
        ]);

        $body = @file_get_contents(config('sso.userinfo_uri'), false, $context);
        $status = $this->statusFromHeaders($http_response_header ?? []);
        if ($body === false || $status >= 400) {
            throw BusinessException::unauthorized("获取 SSO 用户信息失败: HTTP {$status}");
        }

        $data = json_decode($body, true);
        return is_array($data) ? $data : [];
    }

    /** 撤销 token（RFC 7009）；失败只返回 false，不阻塞退出 */
    public function revokeToken(?string $token, string $hint = 'refresh_token'): bool
    {
        if (empty($token) || empty(config('sso.revoke_uri'))) {
            return false;
        }

        try {
            return $this->postForm(config('sso.revoke_uri'), [
                'token' => $token,
                'token_type_hint' => $hint,
                'client_id' => config('sso.client_id'),
                'client_secret' => config('sso.client_secret'),
            ]) !== null;
        } catch (\Throwable $e) {
            trace('[SSO] revoke 失败（忽略，不阻塞退出）: ' . $e->getMessage(), 'warning');
            return false;
        }
    }

    /**
     * 校验 SSO 签发的 JWT（JWKS 验签 + issuer），返回 claims。
     * JWKS 缓存 10 分钟，避免每次请求都拉取。
     */
    public function verifyToken(string $token): array
    {
        $jwks = Cache::remember('sso:jwks', function () {
            $body = @file_get_contents(config('sso.jwks_uri'));
            if ($body === false) {
                throw BusinessException::unauthorized('获取 JWKS 失败');
            }
            return json_decode($body, true);
        }, 600);

        try {
            $decoded = (array) JWT::decode($token, JWK::parseKeySet($jwks));
        } catch (\Throwable $e) {
            throw BusinessException::unauthorized('令牌无效: ' . $e->getMessage());
        }

        if (($decoded['iss'] ?? null) !== config('sso.issuer')) {
            throw BusinessException::unauthorized('令牌 issuer 不匹配');
        }

        return $decoded;
    }

    /** 表单 POST，返回解码后的数组；HTTP 失败返回 null */
    private function postForm(string $url, array $data): ?array
    {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => http_build_query($data),
                'timeout' => 10,
                'ignore_errors' => true,
            ],
        ]);

        $body = @file_get_contents($url, false, $context);
        $status = $this->statusFromHeaders($http_response_header ?? []);
        if ($body === false || $status >= 400) {
            return null;
        }

        $decoded = json_decode($body, true);
        return is_array($decoded) ? $decoded : null;
    }

    /** 从响应头里取 HTTP 状态码 */
    private function statusFromHeaders(array $headers): int
    {
        foreach ($headers as $header) {
            if (preg_match('#HTTP/\d\.\d\s+(\d+)#', $header, $matches)) {
                return (int) $matches[1];
            }
        }
        return 0;
    }
}
