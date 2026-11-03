<?php

declare(strict_types=1);

namespace AntX\Template;

/**
 * BFF 聚合接口（对标 Spring Boot BffController）。
 *
 *   GET /api/bff/me：当前 SSO 身份 + 本地角色 + 是否管理员 + 启停状态；未登录返回 401。
 */
final class BffController
{
    public function me(): Result
    {
        $uid = Security::currentUid();
        if ($uid === null) {
            throw new BusinessException(ResultCode::UNAUTHORIZED, '未登录或登录已过期');
        }
        $local = (new UserRepository())->getByUid($uid);
        return Result::successWith([
            'authType' => 'sso',
            'uid' => $uid,
            'name' => $uid,
            'role' => $local['role'] ?? null,
            'isAdmin' => Security::isAdmin($uid),
            'status' => $local['status'] ?? null,
            'localId' => $local['id'] ?? null,
        ]);
    }
}
