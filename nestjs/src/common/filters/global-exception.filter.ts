/**
 * 全局异常过滤器（对标 Spring Boot 的 GlobalExceptionHandler）。
 * 把业务异常 / 参数校验失败 / 未知异常统一转成五字段响应。
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';
import { ResultCode, RESULT_MESSAGE } from '../result/result-code';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    let code = ResultCode.INTERNAL_ERROR;
    let message: string = RESULT_MESSAGE[ResultCode.INTERNAL_ERROR];

    if (exception instanceof BusinessException) {
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      // ValidationPipe 抛的 400 里 message 可能是数组
      const status = exception.getStatus();
      const body: any = exception.getResponse();
      const raw = typeof body === 'string' ? body : body?.message;
      code = status;
      message = Array.isArray(raw) ? raw.join('；') : raw ?? RESULT_MESSAGE[status] ?? exception.message;
    } else {
      this.logger.error('系统异常', exception?.stack ?? exception);
      message = exception?.message ?? message;
    }

    // 与 Spring 模板一致：HTTP 200 + 业务码，前端只看 code 字段
    response.status(200).json({
      code,
      success: false,
      message,
      data: null,
      timestamp: Date.now(),
    });
  }
}
