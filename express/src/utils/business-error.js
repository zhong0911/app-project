/**
 * 业务异常（对标 Spring Boot 的 BusinessException）。
 * 业务层 throw 出来，由 error.middleware 统一转成五字段响应。
 */
import { ResultCode, ResultMessage } from './result-code.js';

export class BusinessError extends Error {
  constructor(code = ResultCode.BUSINESS_ERROR, message) {
    const finalCode = typeof code === 'number' ? code : ResultCode.BUSINESS_ERROR;
    super(message || ResultMessage[finalCode] || '业务处理失败');
    this.name = 'BusinessError';
    this.code = finalCode;
  }

  static badRequest(message) {
    return new BusinessError(ResultCode.BAD_REQUEST, message);
  }

  static unauthorized(message) {
    return new BusinessError(ResultCode.UNAUTHORIZED, message);
  }

  static forbidden(message) {
    return new BusinessError(ResultCode.FORBIDDEN, message);
  }

  static notFound(message) {
    return new BusinessError(ResultCode.NOT_FOUND, message);
  }

  static conflict(message) {
    return new BusinessError(ResultCode.DATA_CONFLICT, message);
  }
}
