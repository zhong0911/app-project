<?php
/**
 * Web 入口（只暴露 public 目录，保护源码）。
 */

namespace think;

require __DIR__ . '/../vendor/autoload.php';

$http = (new App())->http;

$response = $http->run();

$response->send();

$http->end($response);
