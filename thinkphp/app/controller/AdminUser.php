<?php
/**
 * 管理后台用户管理（对标 Spring Boot 的 controller/AdminUserController）。
 * 仅管理员可访问（Admin 中间件）；删除一律软删除。
 */

namespace app\controller;

use app\BaseController;
use app\service\UserService;
use app\support\Result;
use app\validate\UserCreate;
use app\validate\UserQuery;
use app\validate\UserStatus;
use think\exception\ValidateException;

class AdminUser extends BaseController
{
    public function page()
    {
        $this->check(UserQuery::class, $this->request->only(['pageNum', 'pageSize', 'uid', 'role', 'status']));
        return Result::success((new UserService())->pageQuery(
            (int) $this->request->get('pageNum', 1),
            (int) $this->request->get('pageSize', 10),
            $this->request->get('uid'),
            $this->request->get('role'),
            $this->request->has('status') ? (int) $this->request->get('status') : null,
        ));
    }

    public function recycle()
    {
        $this->check(UserQuery::class, $this->request->only(['pageNum', 'pageSize', 'uid', 'status']));
        return Result::success((new UserService())->pageRecycle(
            (int) $this->request->get('pageNum', 1),
            (int) $this->request->get('pageSize', 10),
            $this->request->get('uid'),
            $this->request->has('status') ? (int) $this->request->get('status') : null,
        ));
    }

    public function create()
    {
        $this->check(UserCreate::class, $this->request->only(['uid']));
        return Result::success((new UserService())->createUser((string) $this->request->post('uid')));
    }

    public function updateStatus($id)
    {
        $this->check(UserStatus::class, $this->request->only(['status']));
        return Result::success((new UserService())->updateStatus((int) $id, (int) $this->request->post('status')));
    }

    public function remove($id)
    {
        (new UserService())->deleteUser((int) $id);
        return Result::success();
    }

    public function restore($id)
    {
        return Result::success((new UserService())->restore((int) $id));
    }

    public function purge($id)
    {
        (new UserService())->purge((int) $id);
        return Result::success();
    }

    private function check(string $validateClass, array $data): void
    {
        $validate = validate($validateClass);
        if (! $validate->check($data)) {
            throw new ValidateException($validate->getError());
        }
    }
}
