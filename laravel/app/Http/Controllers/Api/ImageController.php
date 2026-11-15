<?php
/**
 * 图床接口（对标 Spring Boot 的 controller/ImageController）。
 * 上传 / 列表 / 删除 / 恢复 / 彻底删除全部需要登录（sso.auth 中间件），
 * 图片本身的读取走公开路由 /i/{uuid}（见 routes/image.php）。
 */

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImageQueryRequest;
use App\Http\Requests\ImageUploadRequest;
use App\Services\ImageService;
use App\Support\BusinessException;
use App\Support\Result;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

class ImageController extends Controller
{
    public function __construct(private readonly ImageService $imageService)
    {
    }

    public function upload(ImageUploadRequest $request): JsonResponse
    {
        $file = $request->file('file');
        if (! $file instanceof UploadedFile) {
            throw BusinessException::badRequest('请选择要上传的图片');
        }

        $uid = $this->uid($request);
        [$image, $dedup] = $this->imageService->upload($file, $uid);

        return Result::success(
            ['image' => $image, 'dedup' => $dedup],
            $dedup ? '同图已存在，已复用原链接' : '上传成功',
        );
    }

    public function page(ImageQueryRequest $request): JsonResponse
    {
        return Result::success($this->imageService->pageQuery(
            $request->pageNum(),
            $request->pageSize(),
            $this->uid($request),
            $request->keyword(),
        ));
    }

    public function recycle(ImageQueryRequest $request): JsonResponse
    {
        return Result::success($this->imageService->pageRecycle(
            $request->pageNum(),
            $request->pageSize(),
            $this->uid($request),
            $request->keyword(),
        ));
    }

    public function remove(string $uuid, Request $request): JsonResponse
    {
        $this->imageService->remove($uuid, $this->uid($request));
        return Result::success();
    }

    public function restore(string $uuid, Request $request): JsonResponse
    {
        return Result::success($this->imageService->restore($uuid, $this->uid($request)));
    }

    public function purge(string $uuid, Request $request): JsonResponse
    {
        $this->imageService->purge($uuid, $this->uid($request));
        return Result::success();
    }

    /** 当前登录用户 uid（中间件已保证登录） */
    private function uid(Request $request): string
    {
        $uid = (string) ($request->attributes->get('principal')?->uid ?? '');
        if ($uid === '') {
            throw BusinessException::unauthorized();
        }
        return $uid;
    }
}
