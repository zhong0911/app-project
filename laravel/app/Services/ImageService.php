<?php
/**
 * 图床业务层（对标 Spring Boot 的 service/impl/ImageServiceImpl）。
 *
 * 上传 → 按内容识别 MIME、sha256 去重、落盘 + 入库；读取 → 按 uuid 回源；
 * 删除为软删除（进回收站），彻底删除时同步清理存储对象。
 */

namespace App\Services;

use App\Models\Image;
use App\Repositories\ImageRepository;
use App\Support\BusinessException;
use App\Support\Result;
use App\Support\ResultCode;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageService
{
    /** MIME → 落盘扩展名（不信任原始文件名后缀） */
    private const EXT_MAP = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'image/bmp' => 'bmp',
        'image/avif' => 'avif',
    ];

    public function __construct(private readonly ImageRepository $repository)
    {
    }

    /**
     * 上传图片。
     *
     * @return array{0: array, 1: bool} [图片 VO, 是否命中同内容去重]
     */
    public function upload(UploadedFile $file, string $uid): array
    {
        if (! $file->isValid()) {
            throw BusinessException::badRequest('文件上传失败，请重新选择后重试');
        }

        $maxSize = (int) config('image.max_size', 10 * 1024 * 1024);
        if ($maxSize > 0 && $file->getSize() > $maxSize) {
            throw BusinessException::badRequest(sprintf('图片体积超限，最大 %s MB', round($maxSize / 1048576, 1)));
        }

        // 按文件内容探测 MIME（fileinfo），后缀伪造的脚本会在这里被挡掉
        $mime = (string) $file->getMimeType();
        $allowed = (array) config('image.allowed_mime', []);
        if (! in_array($mime, $allowed, true)) {
            $exts = array_map(static fn (string $m): string => self::EXT_MAP[$m] ?? $m, $allowed);
            throw BusinessException::badRequest('仅支持 '.implode(' / ', $exts).' 格式的图片');
        }

        $realPath = (string) $file->getRealPath();
        $hash = hash_file('sha256', $realPath);

        // 同内容去重：直接复用已有直链，避免重复占用存储
        if ($hash !== false) {
            $exists = $this->repository->findActiveByHash($hash);
            if ($exists !== null) {
                return [$this->toVO($exists), true];
            }
        }

        $ext = self::EXT_MAP[$mime] ?? strtolower((string) $file->getClientOriginalExtension());
        $uuid = $this->newUuid();

        // 按上传者 + 年月分目录，避免单目录文件过多
        $dir = sprintf('u%s/%s', $uid !== '' ? $uid : '0', now()->format('Y/m'));
        $filename = $uuid.'.'.$ext;

        try {
            $storageKey = $this->disk()->putFileAs($dir, $file, $filename);
        } catch (BusinessException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            throw new BusinessException(ResultCode::FILE_ERROR, '图片保存失败，请稍后重试');
        }

        if ($storageKey === false || $storageKey === '') {
            throw new BusinessException(ResultCode::FILE_ERROR, '图片保存失败，请稍后重试');
        }

        [$width, $height] = $this->imageSize($realPath);

        $image = $this->repository->create([
            'uuid' => $uuid,
            'origin_name' => $this->safeName($file->getClientOriginalName()),
            'ext' => $ext,
            'mime_type' => $mime,
            'size' => (int) $file->getSize(),
            'hash' => (string) $hash,
            'width' => $width,
            'height' => $height,
            'storage_key' => $storageKey,
            'uid' => $uid,
            'visit_count' => 0,
            'deleted' => 0,
            'version' => 1,
        ]);

        return [$this->toVO($image), false];
    }

    public function pageQuery(int $pageNum, int $pageSize, string $uid, ?string $keyword = null): array
    {
        [$records, $total] = $this->repository->page($pageNum, $pageSize, $uid, $keyword, 0);
        return Result::page($pageNum, $pageSize, $total, $records->map(fn (Image $i) => $this->toVO($i))->all());
    }

    public function pageRecycle(int $pageNum, int $pageSize, string $uid, ?string $keyword = null): array
    {
        [$records, $total] = $this->repository->page($pageNum, $pageSize, $uid, $keyword, 1);
        return Result::page($pageNum, $pageSize, $total, $records->map(fn (Image $i) => $this->toVO($i))->all());
    }

    public function remove(string $uuid, string $uid): void
    {
        $image = $this->requireOwned($uuid, $uid, false);
        $this->repository->softDelete($image->uuid);
    }

    public function restore(string $uuid, string $uid): array
    {
        $image = $this->requireOwned($uuid, $uid, true);
        $this->repository->restore($image->uuid);
        return $this->toVO($this->repository->findByUuid($image->uuid));
    }

    /** 彻底删除：记录 + 存储对象一起清掉，不可恢复 */
    public function purge(string $uuid, string $uid): void
    {
        $image = $this->requireOwned($uuid, $uid, true);

        try {
            $this->disk()->delete($image->storage_key);
        } catch (\Throwable $e) {
            // 存储删除失败不阻塞记录清理：留痕后由运维侧清理孤儿文件
            report($e);
        }

        $this->repository->purge($image->uuid);
    }

    /** 公开读图用：只认未删除的记录 */
    public function findForView(string $uuid): Image
    {
        $image = $this->repository->findByUuid($uuid);
        if ($image === null) {
            throw BusinessException::notFound('图片不存在或已被删除');
        }
        return $image;
    }

    public function markVisit(Image $image): void
    {
        if (! config('image.count_visit', true)) {
            return;
        }
        try {
            $this->repository->incrementVisit((int) $image->id);
        } catch (\Throwable $e) {
            // 计数失败不影响图片返回
            report($e);
        }
    }

    /** 图片对外直链：{domain}/{prefix}/{uuid} */
    public function url(string $uuid): string
    {
        $domain = (string) config('image.domain', '');
        if ($domain === '') {
            $domain = (string) config('app.url', '');
        }
        $prefix = trim((string) config('image.prefix', 'i'), '/');

        return rtrim($domain, '/').'/'.$prefix.'/'.$uuid;
    }

    /** 实体转 VO（隐藏 storage_key 等内部字段） */
    public function toVO(?Image $image): ?array
    {
        if ($image === null) {
            return null;
        }

        return [
            'id' => (int) $image->id,
            'uuid' => $image->uuid,
            'url' => $this->url((string) $image->uuid),
            'originName' => (string) $image->origin_name,
            'ext' => (string) $image->ext,
            'mimeType' => (string) $image->mime_type,
            'size' => (int) $image->size,
            'width' => $image->width !== null ? (int) $image->width : null,
            'height' => $image->height !== null ? (int) $image->height : null,
            'visitCount' => (int) $image->visit_count,
            'deleted' => (int) $image->deleted,
            'createTime' => optional($image->create_time)?->format('Y-m-d H:i:s'),
        ];
    }

    /** 取记录并校验归属：只能操作自己上传的图片 */
    private function requireOwned(string $uuid, string $uid, bool $includeDeleted): Image
    {
        $image = $this->repository->findByUuid($uuid, $includeDeleted);
        if ($image === null) {
            throw BusinessException::notFound($includeDeleted ? '回收站中不存在该图片' : '图片不存在或已被删除');
        }
        if ($image->uid !== $uid) {
            throw BusinessException::forbidden('只能操作自己上传的图片');
        }
        return $image;
    }

    private function disk()
    {
        $disk = (string) config('image.disk', 'images');
        try {
            return Storage::disk($disk);
        } catch (\Throwable $e) {
            report($e);
            throw new BusinessException(ResultCode::FILE_ERROR, "存储磁盘不可用: {$disk}");
        }
    }

    /** @return array{0: int|null, 1: int|null} */
    private function imageSize(string $path): array
    {
        $info = @getimagesize($path);
        if ($info === false) {
            return [null, null];
        }
        return [(int) $info[0], (int) $info[1]];
    }

    private function newUuid(): string
    {
        return str_replace('-', '', (string) Str::uuid());
    }

    private function safeName(?string $name): string
    {
        $name = trim((string) $name);
        if ($name === '') {
            return 'image';
        }
        return mb_substr($name, 0, 200);
    }
}
