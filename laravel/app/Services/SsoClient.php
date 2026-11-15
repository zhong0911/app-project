<?php
/**
 * SSO 客户端（对标 Spring Boot 的 OAuth2 Client）。
 * 授权码登录 + token 换取 + JWKS 验签 + revoke。
 */

namespace App\Services;

use App\Support\BusinessException;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

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
        $response = Http::asForm()
            ->timeout(10)
            ->post(config('sso.token_uri'), [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => config('sso.redirect_uri'),
                'client_id' => config('sso.client_id'),
                'client_secret' => config('sso.client_secret'),
            ]);

        if ($response->failed()) {
            throw BusinessException::unauthorized('SSO 换取 token 失败: HTTP ' . $response->status());
        }
        return (array) $response->json();
    }

    /** 获取用户资料（sub 即用户唯一标识：可能是整数 uid，也可能是 username / email / phone） */
    public function fetchUserInfo(string $accessToken): array
    {
        $response = Http::withToken($accessToken)
            ->timeout(10)
            ->get(config('sso.userinfo_uri'));

        if ($response->failed()) {
            throw BusinessException::unauthorized('获取 SSO 用户信息失败: HTTP ' . $response->status());
        }
        return (array) $response->json();
    }

    /** 撤销 token（RFC 7009）；失败只返回 false，不阻塞退出 */
    public function revokeToken(?string $token, string $hint = 'refresh_token'): bool
    {
        if (empty($token) || empty(config('sso.revoke_uri'))) {
            return false;
        }

        try {
            $response = Http::asForm()->timeout(10)->post(config('sso.revoke_uri'), [
                'token' => $token,
                'token_type_hint' => $hint,
                'client_id' => config('sso.client_id'),
                'client_secret' => config('sso.client_secret'),
            ]);
            return $response->successful();
        } catch (\Throwable $e) {
            logger()->warning('[SSO] revoke 失败（忽略，不阻塞退出）: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 校验 SSO 签发的 JWT（JWKS 验签 + issuer），返回 claims。
     * JWKS 结果缓存 10 分钟，避免每次请求都拉取。
     */
    public function verifyToken(string $token): array
    {
        $jwks = Cache::remember('sso:jwks', 600, function () {
            $response = Http::timeout(10)->get(config('sso.jwks_uri'));
            if ($response->failed()) {
                throw BusinessException::unauthorized('获取 JWKS 失败: HTTP ' . $response->status());
            }
            return $response->json();
        });

        try {
            $decoded = (array) JWT::decode($token, JWK::parseKeySet($jwks));
        } catch (\Throwable $e) {
            throw BusinessException::unauthorized('令牌无效: ' . $e->getMessage());
        }

        // 校验 issuer（与 Spring 资源服务器的 issuer-uri 等价）
        if (($decoded['iss'] ?? null) !== config('sso.issuer')) {
            throw BusinessException::unauthorized('令牌 issuer 不匹配');
        }

        return $decoded;
    }
}
