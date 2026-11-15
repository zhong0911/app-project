<?php
/**
 * 图片仓储层（对标 Spring Boot 的 mapper/ImageMapper）：只做数据库 CRUD。
 */

namespace App\Repositories;

use App\Models\Image;
use Illuminate\Database\Eloquent\Collection;

class ImageRepository
{
    public function findByUuid(string $uuid, bool $includeDeleted = false): ?Image
    {
        $query = Image::query()->where('uuid', $uuid);
        if (! $includeDeleted) {
            $query->where('deleted', 0);
        }
        return $query->first();
    }

    /** 同内容去重：只认未删除的记录 */
    public function findActiveByHash(string $hash): ?Image
    {
        return Image::query()->where('hash', $hash)->where('deleted', 0)->first();
    }

    /**
     * 分页查询。
     *
     * @return array{0: Collection, 1: int}
     */
    public function page(
        int $pageNum,
        int $pageSize,
        string $uid,
        ?string $keyword = null,
        int $deleted = 0,
    ): array {
        $query = Image::query()->where('deleted', $deleted);
        if ($uid !== '') {
            $query->where('uid', $uid);
        }
        if ($keyword !== null && $keyword !== '') {
            $query->where('origin_name', 'like', '%'.$keyword.'%');
        }

        $total = (clone $query)->count();
        $records = $query->orderByDesc('create_time')
            ->orderByDesc('id')
            ->offset(($pageNum - 1) * $pageSize)
            ->limit($pageSize)
            ->get();

        return [$records, $total];
    }

    public function create(array $attributes): Image
    {
        return Image::query()->create($attributes);
    }

    public function incrementVisit(int $id): void
    {
        Image::query()->where('id', $id)->update([
            'visit_count' => \DB::raw('visit_count + 1'),
        ]);
    }

    public function softDelete(string $uuid): void
    {
        Image::query()->where('uuid', $uuid)->where('deleted', 0)->update([
            'deleted' => 1,
            'version' => \DB::raw('version + 1'),
        ]);
    }

    public function restore(string $uuid): void
    {
        Image::query()->where('uuid', $uuid)->where('deleted', 1)->update([
            'deleted' => 0,
            'version' => \DB::raw('version + 1'),
        ]);
    }

    public function purge(string $uuid): void
    {
        Image::query()->where('uuid', $uuid)->where('deleted', 1)->delete();
    }
}
