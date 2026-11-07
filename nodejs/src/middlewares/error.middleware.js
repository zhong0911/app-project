/**
 * 全局异常处理（对标 Spring Boot 的 GlobalExceptionHandler）。
 * 保证任何异常都返回统一五字段，不把堆栈暴露给前端。
 */
import { BusinessError } from '../utils/business-error.js';
import { ResultCode } from '../utils/result-code.js';
import { error as errorResult } from '../utils/result.js';
import { config } from '../config/index.js';

/** 404 兜底：路由不存在 */
export function notFoundHandler(_req, _res, next) {
  next(new BusinessError(ResultCode.NOT_FOUND));
}

/** 统一异常出口（必须是最后一个中间件） */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof BusinessError) {
    if (err.code >= 500) console.warn('[业务异常]', err.code, err.message);
    return res.status(200).json(errorResult(err.code, err.message));
  }

  // JSON body 解析失败
  if (err.type === 'entity.parse.failed') {
    return res.status(200).json(errorResult(ResultCode.BAD_REQUEST, '请求体格式错误'));
  }

  console.error('[系统异常]', config.app.debug ? err : err.message);
  return res.status(200).json(errorResult(ResultCode.INTERNAL_ERROR, '服务器内部错误'));
}

/** 包装 async 控制器，异常自动转给 errorHandler */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
