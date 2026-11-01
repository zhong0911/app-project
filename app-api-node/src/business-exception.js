import { ResultCode, resultMessage } from './result-code.js';

/**
 * 业务异常（对标 Spring Boot 模板 BusinessException）。
 *
 * 业务层主动抛出，由全局异常处理中间件统一捕获并转成统一响应，
 * 避免把异常细节直接暴露给前端。
 */
export class BusinessException extends Error {
  constructor(code, message) {
    super(message ?? resultMessage(code));
    this.code = code;
  }

  /** 业务异常（默认 1000） */
  static of(message) {
    return new BusinessException(ResultCode.BUSINESS_ERROR, message);
  }

  /** 按状态码，使用默认提示语 */
  static ofCode(code) {
    return new BusinessException(code, resultMessage(code));
  }
}
