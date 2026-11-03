<?php

declare(strict_types=1);

use AntX\Template\AdminUserController;
use AntX\Template\BffController;
use AntX\Template\GlobalExceptionHandler;
use AntX\Template\OAuth2;
use AntX\Template\Result;
use AntX\Template\ResultCode;
use AntX\Template\Security;
use AntX\Template\UserController;

/**
 * AntX PHP 模板 入口（前端控制器 + 极简路由 + 全局异常处理）。
 *
 * 运行：php -S 0.0.0.0:8080 public/index.php
 *
 * 路由规则（对标 Spring Boot RESTful）：
 *   POST   /api/users
 *   PUT    /api/users
 *   DELETE /api/users/{id}
 *   GET    /api/users/{id}
 *   GET    /api/users?pageNum=1&pageSize=10
 *
 * 管理后台用户管理（仅管理员，管理员 uid 由 SSO_ADMIN_UID 配置，默认 1）：
 *   GET    /api/admin/users
 *   POST   /api/admin/users
 *   PUT    /api/admin/users/{id}/status
 *   DELETE /api/admin/users/{id}
 *   GET    /api/admin/users/recycle
 *   POST   /api/admin/users/{id}/restore
 *   DELETE /api/admin/users/{id}/purge
 *   GET    /api/bff/me
 *
 * OAuth2 客户端（全后端统一规范路径，本模板只接入 AntX SSO，provider 固定为 sso）：
 *   GET  /sso/authorize   跳转到授权服务器
 *   GET  /sso/callback    接受授权码 code，换取 token，重定向登录成功页
 *   POST /api/auth/logout 单点退出（撤销 refresh_token + 销毁会话，返回 SSO 退出地址）
 */

spl_autoload_register(static function (string $class): void {
    $prefix = 'AntX\\Template\\';
    if (str_starts_with($class, $prefix)) {
        $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
        $file = __DIR__ . '/../src/' . $relative . '.php';
        if (is_file($file)) {
            require $file;
        }
    }
});

// ---- 解析请求 ----
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = rtrim($path, '/') ?: '/';
$query = $_GET;

// ---- baseUrl（对标 Spring Security {baseUrl}）----
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$baseUrl = $scheme . '://' . $host;

$controller = new UserController();
$adminController = new AdminUserController();
$bffController = new BffController();

try {
    // ---- OAuth2 客户端路由 ----
    if (preg_match('#^/sso/(authorize|callback)$#', $path, $m)) {
        $provider = 'sso';
        $action = $m[1];
        if (!OAuth2::has($provider)) {
            throw new BusinessException(ResultCode::NOT_FOUND, '请求资源不存在');
        }
        if ($action === 'authorize') {
            if ($method !== 'GET') {
                throw new BusinessException(ResultCode::METHOD_NOT_ALLOWED, '请求方法不支持');
            }
            [$url] = OAuth2::authorizeUrl($provider, $baseUrl);
            header('Location: ' . $url);
            exit;
        }
        // callback
        if ($method !== 'GET') {
            throw new BusinessException(ResultCode::METHOD_NOT_ALLOWED, '请求方法不支持');
        }
        $code = $query['code'] ?? null;
        $state = $query['state'] ?? null;
        if (!is_string($code) || $code === '') {
            throw new BusinessException(ResultCode::BAD_REQUEST, '缺少授权码 code');
        }
        // state 校验（模板简化为一次性授权码校验，生产建议结合会话防 CSRF）
        $token = OAuth2::exchangeCode($provider, $code, $baseUrl);
        // token 存服务端会话（access_token/refresh_token 不进浏览器），cookie 仅存 PHPSESSID
        session_start();
        // 会话中冗余存一份 sub(uid)，供管理接口鉴权直接读取
        $token['uid'] = Security::decodeSub($token['access_token'] ?? null);
        $_SESSION['oauth2_tokens'] = $token;
        $cfg = OAuth2::providers()[$provider];
        header('Location: ' . $cfg['loginSuccessUrl']);
        exit;
    }

    // ---- 单点退出（POST /api/auth/logout，对标 Spring Boot AuthController#logout）----
    // 撤销 SSO 侧 refresh_token -> 销毁服务端会话；
    // 返回 ssoLogoutUrl（env SSO_LOGOUT_URI）供前端整页跳转完成 SSO 全局退出
    if ($path === '/api/auth/logout') {
        if ($method !== 'POST') {
            throw new BusinessException(ResultCode::METHOD_NOT_ALLOWED, '请求方法不支持');
        }
        session_start();
        $tokens = $_SESSION['oauth2_tokens'] ?? null;
        if ($tokens) {
            $providers = OAuth2::providers();
            if (isset($providers['sso'])) {
                OAuth2::revokeToken($providers['sso'], $tokens);
            }
        }
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        $logoutUri = getenv('SSO_LOGOUT_URI') ?: null;
        GlobalExceptionHandler::render(200, Result::successWith(['ssoLogoutUrl' => $logoutUri])->toArray());
        exit;
    }

    // ---- BFF 登录态 ----
    if ($path === '/api/bff/me' && $method === 'GET') {
        $result = $bffController->me();
        GlobalExceptionHandler::render(200, $result->toArray());
        exit;
    }

    // ---- 管理后台用户管理（仅管理员） ----
    if ($path === '/api/admin/users') {
        if ($method === 'GET') {
            $result = $adminController->page(
                (int) ($query['pageNum'] ?? 1),
                (int) ($query['pageSize'] ?? 10),
                isset($query['uid']) ? (string) $query['uid'] : null,
                isset($query['status']) && $query['status'] !== '' ? (int) $query['status'] : null
            );
        } elseif ($method === 'POST') {
            $result = $adminController->create(json_decode(file_get_contents('php://input'), true) ?? []);
        } else {
            throw new BusinessException(ResultCode::METHOD_NOT_ALLOWED, '请求方法不支持');
        }
    } elseif ($path === '/api/admin/users/recycle' && $method === 'GET') {
        $result = $adminController->recycle(
            (int) ($query['pageNum'] ?? 1),
            (int) ($query['pageSize'] ?? 10),
            isset($query['uid']) ? (string) $query['uid'] : null
        );
    } elseif (preg_match('#^/api/admin/users/(\d+)/status$#', $path, $m) && $method === 'PUT') {
        $result = $adminController->updateStatus((int) $m[1], json_decode(file_get_contents('php://input'), true) ?? []);
    } elseif (preg_match('#^/api/admin/users/(\d+)/restore$#', $path, $m) && $method === 'POST') {
        $result = $adminController->restore((int) $m[1]);
    } elseif (preg_match('#^/api/admin/users/(\d+)/purge$#', $path, $m) && $method === 'DELETE') {
        $result = $adminController->purge((int) $m[1]);
    } elseif (preg_match('#^/api/admin/users/(\d+)$#', $path, $m) && $method === 'DELETE') {
        $result = $adminController->delete((int) $m[1]);
    }

    // ---- RESTful 用户路由 ----
    elseif ($path === '/api/users') {
        if ($method === 'POST') {
            $result = $controller->create(json_decode(file_get_contents('php://input'), true) ?? []);
        } elseif ($method === 'PUT') {
            $result = $controller->update(json_decode(file_get_contents('php://input'), true) ?? []);
        } elseif ($method === 'GET') {
            $result = $controller->page(
                (int) ($query['pageNum'] ?? 1),
                (int) ($query['pageSize'] ?? 10)
            );
        } else {
            throw new BusinessException(ResultCode::METHOD_NOT_ALLOWED, '请求方法不支持');
        }
    } elseif (preg_match('#^/api/users/(\d+)$#', $path, $m)) {
        $id = (int) $m[1];
        if ($method === 'GET') {
            $result = $controller->detail($id);
        } elseif ($method === 'DELETE') {
            $result = $controller->delete($id);
        } else {
            throw new BusinessException(ResultCode::METHOD_NOT_ALLOWED, '请求方法不支持');
        }
    } else {
        throw new BusinessException(ResultCode::NOT_FOUND, '请求资源不存在');
    }

    GlobalExceptionHandler::render(200, $result->toArray());
} catch (\Throwable $e) {
    [$status, $body] = GlobalExceptionHandler::resolve($e);
    GlobalExceptionHandler::render($status, $body);
}
