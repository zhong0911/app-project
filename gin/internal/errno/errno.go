// Package errno 状态码与业务异常（对标 Spring Boot 的 ResultCode + BusinessException）。
package errno

import "fmt"

// 状态码：业务错误码从 1000 起按模块递增。
const (
	CodeSuccess        = 200
	CodeBadRequest     = 400
	CodeUnauthorized   = 401
	CodeForbidden      = 403
	CodeNotFound       = 404
	CodeMethodNotAllow = 405
	CodeInternalError  = 500
	CodeBusinessError  = 1000
	CodeDataConflict   = 1001
	CodeDBError        = 1002
	CodeFileError      = 1003
)

// Message 状态码默认提示。
var Message = map[int]string{
	CodeSuccess:        "操作成功",
	CodeBadRequest:     "请求参数错误",
	CodeUnauthorized:   "未登录或登录已过期",
	CodeForbidden:      "无访问权限",
	CodeNotFound:       "请求资源不存在",
	CodeMethodNotAllow: "请求方法不支持",
	CodeInternalError:  "服务器内部错误",
	CodeBusinessError:  "业务处理失败",
	CodeDataConflict:   "数据冲突",
	CodeDBError:        "数据库操作失败",
	CodeFileError:      "文件操作失败",
}

// httpStatus 业务码 → HTTP 状态码（与各语言模板保持一致）。
var httpStatus = map[int]int{
	CodeSuccess:        200,
	CodeBadRequest:     400,
	CodeUnauthorized:   401,
	CodeForbidden:      403,
	CodeNotFound:       404,
	CodeMethodNotAllow: 405,
	CodeInternalError:  500,
	CodeBusinessError:  400,
	CodeDataConflict:   409,
	CodeDBError:        500,
	CodeFileError:      500,
}

// HTTPStatus 把业务码映射成真实 HTTP 状态码：
// BUSINESS_ERROR(1000)→400、DATA_CONFLICT(1001)→409、DB_ERROR / FILE_ERROR→500；
// 未知码本身是合法状态码就沿用，否则按 500 处理。
func HTTPStatus(code int) int {
	if status, ok := httpStatus[code]; ok {
		return status
	}
	if code >= 400 && code < 600 {
		return code
	}
	return 500
}

// BusinessError 业务异常：handler 里统一转成 Result。
type BusinessError struct {
	Code    int
	Message string
}

func (e *BusinessError) Error() string {
	return fmt.Sprintf("code=%d message=%s", e.Code, e.Message)
}

// New 构造业务异常（message 为空时取默认提示）。
func New(code int, message string) *BusinessError {
	if message == "" {
		message = Message[code]
	}
	return &BusinessError{Code: code, Message: message}
}

// BadRequest 参数错误。
func BadRequest(message string) *BusinessError { return New(CodeBadRequest, message) }

// Unauthorized 未登录。
func Unauthorized() *BusinessError { return New(CodeUnauthorized, "") }

// Forbidden 无权限。
func Forbidden(message string) *BusinessError { return New(CodeForbidden, message) }

// NotFound 资源不存在。
func NotFound(message string) *BusinessError { return New(CodeNotFound, message) }

// Conflict 数据冲突。
func Conflict(message string) *BusinessError { return New(CodeDataConflict, message) }
