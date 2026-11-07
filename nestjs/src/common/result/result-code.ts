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
