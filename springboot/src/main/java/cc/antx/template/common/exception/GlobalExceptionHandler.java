package cc.antx.template.common.exception;

import cc.antx.template.common.enums.ResultCode;
import cc.antx.template.common.result.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;

import java.util.stream.Collectors;

/**
 * 全局异常处理器。
 *
 * <p>统一将各类异常转换为 {@link Result} 五字段响应，避免异常信息直接暴露给前端。</p>
 *
 * <p>HTTP 状态码与响应体 code 保持一致（不再恒定 200）。业务码映射：</p>
 * <pre>
 * 200→200 400→400 401→401 403→403 404→404 405→405 500→500
 * BUSINESS_ERROR(1000)→400  DATA_CONFLICT(1001)→409
 * DB_ERROR(1002)→500       FILE_ERROR(1003)→500
 * </pre>
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 业务码 → HTTP 状态码（与各语言模板保持一致） */
    static HttpStatusCode httpStatusOf(int code) {
        return switch (code) {
            case 200 -> HttpStatus.OK;
            case 400 -> HttpStatus.BAD_REQUEST;
            case 401 -> HttpStatus.UNAUTHORIZED;
            case 403 -> HttpStatus.FORBIDDEN;
            case 404 -> HttpStatus.NOT_FOUND;
            case 405 -> HttpStatus.METHOD_NOT_ALLOWED;
            case 500 -> HttpStatus.INTERNAL_SERVER_ERROR;
            // 业务错误码段（与 ResultCode 枚举保持一致）
            case 1000 -> HttpStatus.BAD_REQUEST;                    // BUSINESS_ERROR  → 400
            case 1001 -> HttpStatus.CONFLICT;                       // DATA_CONFLICT   → 409
            case 1002, 1003 -> HttpStatus.INTERNAL_SERVER_ERROR;    // DB / FILE_ERROR → 500
            // 未知码：本身是合法 HTTP 状态码就沿用，否则按服务器错误处理
            default -> code >= 400 && code < 600
                    ? HttpStatusCode.valueOf(code)
                    : HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }

    /** 失败响应：HTTP 状态码 + 五字段响应体 */
    private static ResponseEntity<Result<Void>> fail(int code, String message) {
        return ResponseEntity.status(httpStatusOf(code)).body(Result.error(code, message));
    }

    private static ResponseEntity<Result<Void>> fail(ResultCode resultCode) {
        return fail(resultCode.getCode(), resultCode.getMessage());
    }

    private static ResponseEntity<Result<Void>> fail(ResultCode resultCode, String message) {
        return fail(resultCode.getCode(), message);
    }

    /** 业务异常 */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Result<Void>> handleBusinessException(BusinessException e) {
        log.warn("业务异常: code={}, message={}", e.getCode(), e.getMessage());
        return fail(e.getCode(), e.getMessage());
    }

    /** @RequestBody 参数校验失败 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Void>> handleMethodArgumentNotValid(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> fieldError.getDefaultMessage())
                .collect(Collectors.joining("；"));
        log.warn("参数校验失败: {}", message);
        return fail(ResultCode.BAD_REQUEST, message);
    }

    /** 表单绑定 / 普通对象参数校验失败 */
    @ExceptionHandler(BindException.class)
    public ResponseEntity<Result<Void>> handleBindException(BindException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("；"));
        log.warn("参数绑定失败: {}", message);
        return fail(ResultCode.BAD_REQUEST, message);
    }

    /** 方法级参数校验（@Validated + @RequestParam 等） */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Result<Void>> handleConstraintViolation(ConstraintViolationException e) {
        String message = e.getConstraintViolations().stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.joining("；"));
        log.warn("参数约束校验失败: {}", message);
        return fail(ResultCode.BAD_REQUEST, message);
    }

    /** 请求体缺失 / JSON 解析失败 */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Result<Void>> handleHttpMessageNotReadable(HttpMessageNotReadableException e) {
        log.warn("请求体解析失败: {}", e.getMessage());
        return fail(ResultCode.BAD_REQUEST, "请求体格式错误");
    }

    /** 缺少必需请求参数 */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Result<Void>> handleMissingParam(MissingServletRequestParameterException e) {
        log.warn("缺少请求参数: {}", e.getParameterName());
        return fail(ResultCode.BAD_REQUEST, "缺少必需参数: " + e.getParameterName());
    }

    /** 参数类型不匹配（如把字符串传给 Integer 参数） */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Result<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        log.warn("参数类型不匹配: {}", e.getName());
        return fail(ResultCode.BAD_REQUEST, "参数 " + e.getName() + " 类型不正确");
    }

    /** 请求方法不支持（如 GET 请求 POST 接口） */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Result<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
        log.warn("请求方法不支持: {}", e.getMethod());
        return fail(ResultCode.METHOD_NOT_ALLOWED);
    }

    /** 404：请求路径不存在（需在配置中开启 throw-exception-if-no-handler-found） */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<Result<Void>> handleNoHandlerFound(NoHandlerFoundException e) {
        log.warn("路径不存在: {}", e.getRequestURL());
        return fail(ResultCode.NOT_FOUND);
    }

    /** 静态资源不存在 */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Result<Void>> handleNoResourceFound(NoResourceFoundException e) {
        log.warn("资源不存在: {}", e.getResourcePath());
        return fail(ResultCode.NOT_FOUND);
    }

    /** 兜底：未知异常 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleException(Exception e) {
        log.error("系统异常", e);
        return fail(ResultCode.INTERNAL_ERROR);
    }
}
