/**
 * 业务异常（对标 Spring Boot 的 BusinessException）。
 * 业务层 throw，由全局异常过滤器转成统一五字段响应。
 */
import { ResultCode, RESULT_MESSAGE } from '../result/result-code';

export class BusinessException extends Error {
  constructor(
    public readonly code: number = ResultCode.BUSINESS_ERROR,
    message?: string,
  ) {
    super(message ?? RESULT_MESSAGE[code] ?? '业务处理失败');
    this.name = 'BusinessException';
  }

  static badRequest(message?: string) {
    return new BusinessException(ResultCode.BAD_REQUEST, message);
  }

  static unauthorized(message?: string) {
    return new BusinessException(ResultCode.UNAUTHORIZED, message);
  }

  static forbidden(message?: string) {
    return new BusinessException(ResultCode.FORBIDDEN, message);
  }

  static notFound(message?: string) {
    return new BusinessException(ResultCode.NOT_FOUND, message);
  }

  static conflict(message?: string) {
    return new BusinessException(ResultCode.DATA_CONFLICT, message);
  }
}
