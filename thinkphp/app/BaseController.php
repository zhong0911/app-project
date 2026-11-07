<?php
/**
 * 控制器基类（ThinkPHP 约定）。
 */

namespace app;

use think\App;

abstract class BaseController
{
    protected App $app;
    protected \think\Request $request;

    public function __construct(App $app)
    {
        $this->app = $app;
        $this->request = $this->app->request;
    }
}
