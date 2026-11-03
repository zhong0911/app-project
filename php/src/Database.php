<?php

declare(strict_types=1);

namespace AntX\Template;

/**
 * MySQL 连接（PDO 单例，对标 Spring Boot 模板 DataSource 配置）。
 *
 * 环境变量与 springboot 模板保持一致：
 *   DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
 */
final class Database
{
    private static ?\PDO $pdo = null;

    public static function pdo(): \PDO
    {
        if (self::$pdo instanceof \PDO) {
            return self::$pdo;
        }
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $port = getenv('DB_PORT') ?: '3306';
        $name = getenv('DB_NAME') ?: 'antx_template';
        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
        self::$pdo = new \PDO(
            $dsn,
            getenv('DB_USER') ?: 'root',
            getenv('DB_PASSWORD') ?: '',
            [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                \PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        return self::$pdo;
    }
}
