<?php
/**
 * BFF 聚合接口（对标 Spring Boot 的 controller/BffController）。
 * GET /api/bff/me —— 一次拿到登录态：SSO 身份 + 本地角色。
 */

namespace app\controller;

use app\BaseController;
use app\service\UserService;
use app\support\Result;

class Bff extends BaseController
{
    public function me()
    {
        $principal = $this->request->principal;
        if ($principal === null || ! $principal->isLoggedIn()) {
            return Result::success([]);
        }

        $uid = (string) $principal->uid;
        $userService = new UserService();
        $data = [
            'authType' => $principal->authType,
            'uid' => $uid,
            'name' => $principal->name,
            'isAdmin' => $userService->isAdmin($uid),
        ];

        // 聚合本地角色 / 启停状态（未注册则无角色）
        $local = $userService->getByUid($uid);
        if ($local !== null) {
            $data['localId'] = (int) $local->id;
            $data['role'] = $local->role;
            $data['status'] = (int) $local->status;
        }

        return Result::success($data);
    }
}
