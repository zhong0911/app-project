package cc.antx.template.common.result;

import cc.antx.template.common.enums.ResultCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serial;
import java.io.Serializable;

/**
 * 统一响应体（FastJSON 格式，五字段）。
 *
 * <pre>
 * {
 *   "code":      200,
 *   "success":   true,
 *   "message":   "操作成功",
 *   "data":      {...},
 *   "timestamp": 1720000000000
 * }
 * </pre>
 *
 * @param <T> 业务数据类型
 */
@Getter
@Setter
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Result<T> implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 状态码 */
    private int code;

    /** 是否成功 */
    private boolean success;

    /** 提示信息 */
    private String message;

    /** 业务数据 */
    private T data;

    /** 时间戳（毫秒） */
    private long timestamp;

    private Result(int code, boolean success, String message, T data) {
        this.code = code;
        this.success = success;
        this.message = message;
        this.data = data;
        this.timestamp = System.currentTimeMillis();
    }

    /** 成功（无数据） */
    public static <T> Result<T> success() {
        return new Result<>(ResultCode.SUCCESS.getCode(), true, ResultCode.SUCCESS.getMessage(), null);
    }

    /** 成功（带数据） */
    public static <T> Result<T> success(T data) {
        return new Result<>(ResultCode.SUCCESS.getCode(), true, ResultCode.SUCCESS.getMessage(), data);
    }

    /** 成功（自定义提示 + 数据） */
    public static <T> Result<T> success(String message, T data) {
        return new Result<>(ResultCode.SUCCESS.getCode(), true, message, data);
    }

    /** 失败（按状态码枚举） */
    public static <T> Result<T> error(ResultCode resultCode) {
        return new Result<>(resultCode.getCode(), false, resultCode.getMessage(), null);
    }

    /** 失败（按状态码枚举 + 自定义提示） */
    public static <T> Result<T> error(ResultCode resultCode, String message) {
        return new Result<>(resultCode.getCode(), false, message, null);
    }

    /** 失败（自定义 code + message） */
    public static <T> Result<T> error(int code, String message) {
        return new Result<>(code, false, message, null);
    }

    /** 失败（自定义 message，code 用默认业务错误） */
    public static <T> Result<T> error(String message) {
        return new Result<>(ResultCode.BUSINESS_ERROR.getCode(), false, message, null);
    }
}
