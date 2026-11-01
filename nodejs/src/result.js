import { ResultCode, resultMessage } from './result-code.js';

/**
 * 统一响应体（对标 Spring Boot 模板 Result）。
 *
 * 五字段：
 * {
 *   "code":      200,
 *   "success":   true,
 *   "message":   "操作成功",
 *   "data":      {...},
 *   "timestamp": 1720000000000     // 毫秒
 * }
 *
 * data 为 null 时省略（对标 @JsonInclude(NON_NULL)）。
 */
export const Result = Object.freeze({
  /** 成功（无数据） */
  success() {
    return build(ResultCode.SUCCESS, true, resultMessage(ResultCode.SUCCESS), null);
  },

  /** 成功（带数据） */
  successWith(data) {
    return build(ResultCode.SUCCESS, true, resultMessage(ResultCode.SUCCESS), data);
  },

  /** 成功（自定义提示 + 数据） */
  successMsg(message, data) {
    return build(ResultCode.SUCCESS, true, message, data);
  },

  /** 失败（按状态码，使用默认提示语） */
  error(code) {
    return build(code, false, resultMessage(code), null);
  },

  /** 失败（按状态码 + 自定义提示） */
  errorMsg(code, message) {
    return build(code, false, message, null);
  },
});

function build(code, success, message, data) {
  const payload = {
    code,
    success,
    message,
    timestamp: Date.now(),
  };
  if (data !== null && data !== undefined) {
    payload.data = data;
  }
  return payload;
}
