<?php
/**
 * 管理后台用户管理（对标 Spring Boot 的 controller/AdminUserController）。
 * 仅管理员可访问（sso.admin 中间件）；删除一律软删除。
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserCreateRequest;
use App\Http\Requests\UserQueryRequest;
use App\Http\Requests\UserStatusRequest;
use App\Services\UserService;
use App\Support\Result;
use Illuminate\Http\JsonResponse;

class AdminUserController extends Controller
{
    public function __construct(private readonly UserService $userService)
    {
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

    public function recycle(UserQueryRequest $request): JsonResponse
    {
        return Result::success($this->userService->pageRecycle(
            $request->pageNum(),
            $request->pageSize(),
            $request->input('uid'),
            $request->has('status') ? (int) $request->input('status') : null,
        ));
    }

    public function create(UserCreateRequest $request): JsonResponse
    {
        return Result::success($this->userService->createUser((string) $request->validated('uid')));
    }

    public function updateStatus(int $id, UserStatusRequest $request): JsonResponse
    {
        return Result::success($this->userService->updateStatus($id, (int) $request->validated('status')));
    }

    public function remove(int $id): JsonResponse
    {
        $this->userService->deleteUser($id);
        return Result::success();
    }

    public function restore(int $id): JsonResponse
    {
        return Result::success($this->userService->restore($id));
    }

    public function purge(int $id): JsonResponse
    {
        $this->userService->purge($id);
        return Result::success();
    }
}
