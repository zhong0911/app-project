<?php

declare(strict_types=1);

namespace AntX\Template;

/**
 * 分页数据封装（对标 Spring Boot 模板 PageResult），作为 ApiResponse.data 的载体。
 *
 * {
 *   "pageNum":  1,
 *   "pageSize": 10,
 *   "total":    42,
 *   "pages":    5,
 *   "records":  [ ... ]
 * }
 */
final class PaginatedData
{
    public int $pageNum;
    public int $pageSize;
    public int $total;
    public int $pages;
    public array $records;

    /**
     * @param int   $pageNum  当前页码（从 1 开始）
     * @param int   $pageSize 每页条数
     * @param int   $total    总条数
     * @param array $records  当前页数据
     */
    public function __construct(int $pageNum, int $pageSize, int $total, array $records)
    {
        $this->pageNum = $pageNum;
        $this->pageSize = $pageSize;
        $this->total = $total;
        $this->records = $records;
        // 总页数：向上取整；pageSize 为 0 时视为 0 页
        $this->pages = $pageSize === 0 ? 0 : (int) ceil($total / $pageSize);
    }
}
