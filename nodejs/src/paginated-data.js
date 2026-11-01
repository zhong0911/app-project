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
export class PaginatedData {
  constructor(pageNum, pageSize, total, records) {
    this.pageNum = Math.max(1, pageNum);
    this.pageSize = Math.max(1, Math.min(100, pageSize));
    this.total = total;
    // 总页数：向上取整；pageSize 为 0 时视为 0 页
    this.pages = this.pageSize === 0 ? 0 : Math.ceil(this.total / this.pageSize);
    this.records = records ?? [];
  }
}
