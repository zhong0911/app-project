<?php
/**
 * 数据库配置（统一用 .env 的 DB_* 变量）。
 */
return [
    'default' => env('DB_CONNECTION', 'mysql'),
    'time_query_rule' => [],
    'auto_timestamp' => false,
    'datetime_format' => 'Y-m-d H:i:s',

    'connections' => [
        'mysql' => [
            'type' => 'mysql',
            'hostname' => env('DB_HOST', '127.0.0.1'),
            'database' => env('DB_DATABASE', 'antx_template'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'hostport' => env('DB_PORT', '3306'),
            'params' => [
                \PDO::ATTR_EMULATE_PREPARES => false,
                \PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8mb4',
            ],
            'charset' => 'utf8mb4',
            'prefix' => '',
            'debug' => (bool) env('DB_DEBUG', false),
        ],
    ],
];
