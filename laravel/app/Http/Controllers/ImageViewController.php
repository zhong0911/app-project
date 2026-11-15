<?php
/**
 * 图片公开访问（GET /i/{uuid}）：不鉴权、不写会话，直接按 uuid 回源存储。
 * 渲染长缓存 + ETag，重复访问可命中浏览器/CDN 缓存返回 304。
 */

namespace App\Http\Controllers;

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
        $image = $this->imageService->findForView($uuid);

        $etag = '"'.$image->hash.'"';
        if ($image->hash !== '' && trim((string) $request->headers->get('If-None-Match')) === $etag) {
            return response('', 304);
        }

        $disk = Storage::disk((string) config('image.disk', 'images'));
        if (! $disk->exists($image->storage_key)) {
            throw BusinessException::notFound('图片文件已丢失');
        }

        $stream = $disk->readStream($image->storage_key);
        if ($stream === null) {
            throw BusinessException::notFound('图片文件已丢失');
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
}
