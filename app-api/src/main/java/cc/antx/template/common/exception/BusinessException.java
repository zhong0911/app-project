package cc.antx.template.common.exception;

import cc.antx.template.common.enums.ResultCode;
import lombok.Getter;

import java.io.Serial;

/**
 * 业务异常。
 *
 * <p>业务层主动抛出，由 {@link GlobalExceptionHandler} 统一捕获并转成统一响应。</p>
 */
@Getter
public class BusinessException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 错误码 */
    private final int code;

    public BusinessException(String message) {
        super(message);
        this.code = ResultCode.BUSINESS_ERROR.getCode();
    }

    public BusinessException(ResultCode resultCode) {
        super(resultCode.getMessage());
        this.code = resultCode.getCode();
    }

    public BusinessException(ResultCode resultCode, String message) {
        super(message);
        this.code = resultCode.getCode();
    }

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }
}
