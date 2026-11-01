<?php

declare(strict_types=1);

use AntX\Template\ApiResponse;
use AntX\Template\GlobalExceptionHandler;
use AntX\Template\ResultCode;
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

$controller = new UserController();

try {
    // RESTful 用户路由
    if ($path === '/api/users') {
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
