<?php
/**
 * 用户接口（对标 Spring Boot 的 controller/UserController）。
 * 全部需要登录（Auth 中间件）。
 */

namespace app\controller;

use app\BaseController;
use app\service\UserService;
use app\support\Result;
use app\validate\UserCreate;
use app\validate\UserQuery;
use app\validate\UserUpdate;
use think\exception\ValidateException;

class User extends BaseController
{
    public function create()
    {
        $this->check(UserCreate::class, $this->request->only(['uid']));
        return Result::success((new UserService())->createUser((string) $this->request->post('uid')));
    }

    public function update()
    {
        $this->check(UserUpdate::class, $this->request->only(['id', 'role']));
        return Result::success((new UserService())->updateUser(
            (int) $this->request->post('id'),
            (string) $this->request->post('role'),
        ));
    }

    public function remove($id)
    {
        (new UserService())->deleteUser((int) $id);
        return Result::success();
    }

    public function detail($id)
    {
        return Result::success((new UserService())->getUser((int) $id));
    }

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

    /** 手工触发校验（失败抛 ValidateException，由 ExceptionHandle 转五字段） */
    private function check(string $validateClass, array $data): void
    {
        $validate = validate($validateClass);
        if (! $validate->check($data)) {
            throw new ValidateException($validate->getError());
        }
    }
}
