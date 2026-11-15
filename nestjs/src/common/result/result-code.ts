/**
 * 统一状态码（对标 Spring Boot 的 common/enums/ResultCode）。
 */
export enum ResultCode {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  INTERNAL_ERROR = 500,
  BUSINESS_ERROR = 1000,
  DATA_CONFLICT = 1001,
  DB_ERROR = 1002,
  FILE_ERROR = 1003,
}

export const RESULT_MESSAGE: Record<number, string> = {
  [ResultCode.SUCCESS]: '操作成功',
  [ResultCode.BAD_REQUEST]: '请求参数错误',
  [ResultCode.UNAUTHORIZED]: '未登录或登录已过期',
  [ResultCode.FORBIDDEN]: '无访问权限',
  [ResultCode.NOT_FOUND]: '请求资源不存在',
  [ResultCode.METHOD_NOT_ALLOWED]: '请求方法不支持',
  [ResultCode.INTERNAL_ERROR]: '服务器内部错误',
  [ResultCode.BUSINESS_ERROR]: '业务处理失败',
  [ResultCode.DATA_CONFLICT]: '数据冲突',
  [ResultCode.DB_ERROR]: '数据库操作失败',
  [ResultCode.FILE_ERROR]: '文件操作失败',
};

/**
 * 业务码 → HTTP 状态码（与各语言模板保持一致）。
 *
 * BUSINESS_ERROR(1000) → 400、DATA_CONFLICT(1001) → 409、DB_ERROR / FILE_ERROR → 500。
 * 让响应体里的 code 与真实 HTTP 状态码对齐，前端可直接按状态码判断。
 */
export const httpStatusOf = (code: number): number => {
  switch (code) {
    case ResultCode.SUCCESS:
      return 200;
    case ResultCode.BAD_REQUEST:
      return 400;
    case ResultCode.UNAUTHORIZED:
      return 401;
    case ResultCode.FORBIDDEN:
      return 403;
    case ResultCode.NOT_FOUND:
      return 404;
    case ResultCode.METHOD_NOT_ALLOWED:
      return 405;
    case ResultCode.INTERNAL_ERROR:
      return 500;
    case ResultCode.BUSINESS_ERROR:
      return 400;
    case ResultCode.DATA_CONFLICT:
      return 409;
    case ResultCode.DB_ERROR:
    case ResultCode.FILE_ERROR:
      return 500;
    default:
      // 未知码：本身是合法 HTTP 状态码就沿用，否则按服务器错误处理
      return code >= 400 && code < 600 ? code : 500;
  }
};
