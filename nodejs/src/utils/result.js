/**
 * 统一响应体（对标 Spring Boot 的 Result / PageResult）。
 *
 * 所有接口（含异常）都返回五字段：
 * {"code":200,"success":true,"message":"操作成功","data":{},"timestamp":1720000000000}
 */
import { ResultCode } from './result-code.js';

export const success = (data = null, message = '操作成功') => ({
  code: ResultCode.SUCCESS,
  success: true,
  message,
  data,
  timestamp: Date.now(),
});

export const error = (code = ResultCode.BUSINESS_ERROR, message = '业务处理失败') => ({
  code,
  success: false,
  message,
  data: null,
  timestamp: Date.now(),
});

/** 分页载体 */
export const pageResult = ({ pageNum, pageSize, total, records }) => ({
  pageNum: Number(pageNum),
  pageSize: Number(pageSize),
  total: Number(total),
  pages: pageSize ? Math.ceil(total / pageSize) : 0,
  records,
});
