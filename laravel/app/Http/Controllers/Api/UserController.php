<?php
/**
 * 用户接口（对标 Spring Boot 的 controller/UserController）。
 * 全部需要登录（sso.auth 中间件）；入参 Request（DTO）、出参 Resource（VO）。
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserCreateRequest;
use App\Http\Requests\UserQueryRequest;
use App\Http\Requests\UserUpdateRequest;
use App\Services\UserService;
use App\Support\Result;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(private readonly UserService $userService)
    {
    }

    public function create(UserCreateRequest $request): JsonResponse
    {
        return Result::success($this->userService->createUser((string) $request->validated('uid')));
    }

    public function update(UserUpdateRequest $request): JsonResponse
    {
        return Result::success($this->userService->updateUser(
            (int) $request->validated('id'),
            (string) $request->validated('role'),
        ));
    }

    public function remove(int $id): JsonResponse
    {
        $this->userService->deleteUser($id);
        return Result::success();
    }

    public function detail(int $id): JsonResponse
    {
        return Result::success($this->userService->getUser($id));
    }

    public function page(UserQueryRequest $request): JsonResponse
    {
        return Result::success($this->userService->pageQuery(
            $request->pageNum(),
            $request->pageSize(),
            $request->input('uid'),
            $request->input('role'),
            $request->has('status') ? (int) $request->input('status') : null,
        ));
    }
}
