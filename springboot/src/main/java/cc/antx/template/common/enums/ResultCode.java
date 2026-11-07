package cc.antx.template.common.enums;

import lombok.Getter;

/**
 * 统一响应状态码枚举。
 *
 * <p>业务错误码建议从 1000 开始按模块递增，避免与 HTTP 状态码混淆。</p>
 */
@Getter
public enum ResultCode {

    /** 成功 */
    SUCCESS(200, "操作成功"),

    /** 参数校验失败 */
    BAD_REQUEST(400, "请求参数错误"),

    /** 未认证 / 未登录 */
    UNAUTHORIZED(401, "未登录或登录已过期"),

    /** 无权限访问 */
    FORBIDDEN(403, "无访问权限"),

    /** 资源不存在 */
    NOT_FOUND(404, "请求资源不存在"),

    /** 请求方法不支持 */
    METHOD_NOT_ALLOWED(405, "请求方法不支持"),

    /** 服务器内部错误 */
    INTERNAL_ERROR(500, "服务器内部错误"),

    /** 业务异常（默认） */
    BUSINESS_ERROR(1000, "业务处理失败"),

    /** 数据校验（如唯一性冲突、状态冲突） */
    DATA_CONFLICT(1001, "数据冲突"),

    /** 数据库操作失败 */
    DB_ERROR(1002, "数据库操作失败"),

    /** 文件操作失败 */
    FILE_ERROR(1003, "文件操作失败");

    private final int code;
    private final String message;

    ResultCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
