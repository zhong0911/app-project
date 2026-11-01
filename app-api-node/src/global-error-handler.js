import { ApiResponse } from './api-response.js';
import { BusinessException } from './business-exception.js';
import { ResultCode } from './result-code.js';

/**
 * 全局异常处理中间件（对标 Spring Boot 模板 GlobalExceptionHandler）。
 *
 * 统一把各类异常转换为 ApiResponse 五字段响应，错误也按同一格式返回：
 *   - BusinessException   -> 业务 code + message
 *   - 404（路由未匹配）    -> NOT_FOUND
 *   - 兜底                 -> INTERNAL_ERROR，不暴露异常信息
 */
export function globalErrorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof BusinessException) {
    const code = err.code;
    // 业务码段：HTTP 状态统一用 200（业务错误由 code 表达）；HTTP 语义段保持对应状态
    const httpStatus = code >= 1000 ? 200 : code;
    console.warn(`[业务异常] code=${code}, message=${err.message}`);
    return res.status(httpStatus).json(ApiResponse.errorMsg(code, err.message));
  }

  // 兜底：未知异常（含 JSON 解析失败等），不向前端暴露异常细节
  console.error('[全局异常]', err);
  return res.status(500).json(ApiResponse.error(ResultCode.INTERNAL_ERROR));
}
