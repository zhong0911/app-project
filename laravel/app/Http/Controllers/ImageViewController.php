<?php
/**
 * 图片公开访问（GET /i/{uuid}）：不鉴权、不写会话，直接按 uuid 回源存储。
 * 渲染长缓存 + ETag，重复访问可命中浏览器/CDN 缓存返回 304。
 */

namespace App\Http\Controllers;

use App\Models\Image;
use App\Services\ImageService;
use App\Support\BusinessException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ImageViewController extends Controller
{
    public function __construct(private readonly ImageService $imageService)
    {
    }

    public function show(string $uuid, Request $request): StreamedResponse|\Illuminate\Http\Response
    {
        $image = $this->findImage($uuid);

        $etag = '"'.$image->hash.'"';
        if ($image->hash !== '' && trim((string) $request->headers->get('If-None-Match')) === $etag) {
            return response('', 304);
        }

        $disk = Storage::disk((string) config('image.disk', 'images'));
        if (! $disk->exists($image->storage_key)) {
            abort(404);
        }

        $stream = $disk->readStream($image->storage_key);
        if ($stream === null) {
            abort(404);
        }

        $this->imageService->markVisit($image);

        return response()->stream(
            function () use ($stream): void {
                fpassthru($stream);
                if (is_resource($stream)) {
                    fclose($stream);
                }
            },
            200,
            [
                'Content-Type' => $image->mime_type !== '' ? $image->mime_type : 'application/octet-stream',
                'Content-Length' => (string) $image->size,
                'Cache-Control' => 'public, max-age=31536000, immutable',
                'ETag' => $etag,
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
    }

    /**
     * 直链是给浏览器 / CDN / <img> 用的，不套 API 的五字段契约：
     * 记录不存在（含已删除、已彻底删除）一律按 HTTP 404 返回。
     */
    private function findImage(string $uuid): Image
    {
        try {
            return $this->imageService->findForView($uuid);
        } catch (BusinessException) {
            abort(404);
        }
    }
}
