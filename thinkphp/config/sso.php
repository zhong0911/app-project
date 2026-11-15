<?php
/**
 * SSO 配置（对标 Spring Boot 的 spring.security.oauth2.client + sso.*）。
 */
return [
    'issuer' => env('SSO_ISSUER', 'https://passport.antx.cc'),
    'client_id' => env('SSO_CLIENT_ID', 'your-sso-client-id'),
    'client_secret' => env('SSO_CLIENT_SECRET', 'your-sso-client-secret'),
    'scope' => env('SSO_SCOPE', 'openid,profile,email,roles,permissions'),
    // 回调地址：必须在 SSO 控制台登记（全后端统一 /sso/callback）
    'redirect_uri' => env('SSO_REDIRECT_URI', 'http://localhost:8080/sso/callback'),
    'authorization_uri' => env('SSO_AUTHORIZATION_URI', 'https://passport.antx.cc/oauth2/authorize'),
    'token_uri' => env('SSO_TOKEN_URI', 'https://passport.antx.cc/oauth2/token'),
    'userinfo_uri' => env('SSO_USERINFO_URI', 'https://passport.antx.cc/userinfo'),
    'jwks_uri' => env('SSO_JWKS_URI', 'https://passport.antx.cc/oauth2/jwks'),
    'revoke_uri' => env('SSO_REVOKE_URI', 'https://passport.antx.cc/oauth2/revoke'),
    'login_success_url' => env('SSO_LOGIN_SUCCESS_URL', '/'),
    'logout_uri' => env('SSO_LOGOUT_URI', ''),
    // 管理员 uid（= access_token 的 sub）
    'admin_uid' => env('SSO_ADMIN_UID', '1'),

    // 本地联调 Basic（生产置 false）
    'basic_enabled' => env('SECURITY_BASIC_ENABLED', true),
    'basic_username' => env('SECURITY_ADMIN_USERNAME', 'admin'),
    'basic_password' => env('SECURITY_ADMIN_PASSWORD', 'admin123'),
];
