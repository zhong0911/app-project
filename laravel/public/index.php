<?php
/**
 * Web 入口（所有请求都从这里进入；Web 服务器只暴露 public 目录，保护源码）。
 */

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

require __DIR__.'/../vendor/autoload.php';

/** @var \Illuminate\Foundation\Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
