<?php
/**
 * 角色示例接口（对标 Spring Boot 的 controller/SecurityDemoController）。
 */

namespace app\controller;

use app\BaseController;
use app\support\Result;

class Demo extends BaseController
{
    public function adminOnly()
    {
        $name = $this->request->principal?->name;
        return Result::success("你好，管理员 {$name}");
    }

    public function anyLoginUser()
    {
        $name = $this->request->principal?->name;
        return Result::success("你好，{$name}");
    }
}
