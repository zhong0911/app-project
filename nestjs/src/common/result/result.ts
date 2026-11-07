/**
 * 统一响应体（对标 Spring Boot 的 Result / PageResult）。
 * 所有接口（含异常）都返回五字段。
 */
import { ResultCode, RESULT_MESSAGE } from './result-code';

export interface ResultBody<T> {
  code: number;
  success: boolean;
  message: string;
  data: T | null;
  timestamp: number;
}

export class Result {
  static success<T>(data: T | null = null, message = RESULT_MESSAGE[ResultCode.SUCCESS]): ResultBody<T> {
    return { code: ResultCode.SUCCESS, success: true, message, data, timestamp: Date.now() };
  }

  static error(code: number = ResultCode.BUSINESS_ERROR, message?: string): ResultBody<null> {
    return {
      code,
      success: false,
      message: message ?? RESULT_MESSAGE[code] ?? '业务处理失败',
      data: null,
      timestamp: Date.now(),
    };
  }
}

/** 分页载体 */
export interface PageResult<T> {
  pageNum: number;
  pageSize: number;
  total: number;
  pages: number;
  records: T[];
}

export function pageResult<T>(pageNum: number, pageSize: number, total: number, records: T[]): PageResult<T> {
  return {
    pageNum,
    pageSize,
    total,
    pages: pageSize ? Math.ceil(total / pageSize) : 0,
    records,
  };
}
