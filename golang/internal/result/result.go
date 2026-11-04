// Package result 提供统一响应体（Result / PageResult）、状态码与业务异常，
// 对标 nodejs 的 result.js / result-code.js / page-result.js / business-exception.js。
package result

import (
	"fmt"
	"math"
	"time"
)

// HTTP 语义段状态码。
const (
	Success          = 200
	BadRequest       = 400
	Unauthorized     = 401
	Forbidden        = 403
	NotFound         = 404
	MethodNotAllowed = 405
	InternalError    = 500
)

// 业务码段（1000 起，按模块递增）。
const (
	BusinessError = 1000
	DataConflict  = 1001
	DBError       = 1002
	FileError     = 1003
)

var messages = map[int]string{
	Success:          "操作成功",
	BadRequest:       "请求参数错误",
	Unauthorized:     "未登录或登录已过期",
	Forbidden:        "无访问权限",
	NotFound:         "请求资源不存在",
	MethodNotAllowed: "请求方法不支持",
	InternalError:    "服务器内部错误",
	BusinessError:    "业务处理失败",
	DataConflict:     "数据冲突",
	DBError:          "数据库操作失败",
	FileError:        "文件操作失败",
}

// Message 返回状态码对应的默认提示语；未登记时返回空串。
func Message(code int) string {
	return messages[code]
}

// Result 统一响应体；data 为空时省略（对标 @JsonInclude(NON_NULL)）。
type Result struct {
	Code      int    `json:"code"`
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	Timestamp int64  `json:"timestamp"`
	Data      any    `json:"data,omitempty"`
}

// Success 成功（无数据）。
func SuccessResult() Result {
	return Result{Code: Success, Success: true, Message: Message(Success), Timestamp: nowMillis()}
}

// SuccessWith 成功（带数据）。
func SuccessWith(data any) Result {
	return Result{Code: Success, Success: true, Message: Message(Success), Timestamp: nowMillis(), Data: data}
}

// SuccessMsg 成功（自定义提示 + 数据）。
func SuccessMsg(message string, data any) Result {
	return Result{Code: Success, Success: true, Message: message, Timestamp: nowMillis(), Data: data}
}

// Error 失败（按状态码使用默认提示语）。
func Error(code int) Result {
	return Result{Code: code, Success: false, Message: Message(code), Timestamp: nowMillis()}
}

// ErrorMsg 失败（按状态码 + 自定义提示）。
func ErrorMsg(code int, message string) Result {
	return Result{Code: code, Success: false, Message: message, Timestamp: nowMillis()}
}

func nowMillis() int64 {
	return time.Now().UnixMilli()
}

// PageResult 分页数据封装，作为 Result.data 的载体。
type PageResult struct {
	PageNum  int   `json:"pageNum"`
	PageSize int   `json:"pageSize"`
	Total    int64 `json:"total"`
	Pages    int   `json:"pages"`
	Records  any   `json:"records"`
}

// NewPageResult 构造分页结果，pageNum/pageSize 按模板规则收敛。
func NewPageResult(pageNum, pageSize int, total int64, records any) PageResult {
	if pageNum < 1 {
		pageNum = 1
	}
	if pageSize < 1 {
		pageSize = 1
	}
	if pageSize > 100 {
		pageSize = 100
	}
	pages := 0
	if pageSize > 0 {
		pages = int(math.Ceil(float64(total) / float64(pageSize)))
	}
	if records == nil {
		records = []any{}
	}
	return PageResult{PageNum: pageNum, PageSize: pageSize, Total: total, Pages: pages, Records: records}
}

// BusinessException 业务异常（对标 nodejs BusinessException）。
type BusinessException struct {
	Code    int
	Message string
}

func (e *BusinessException) Error() string {
	return e.Message
}

// NewBusiness 构造业务异常；message 为空时使用状态码默认提示语。
func NewBusiness(code int, message string) *BusinessException {
	if message == "" {
		message = Message(code)
	}
	return &BusinessException{Code: code, Message: message}
}

// BadRequestError 参数错误。
func BadRequestError(message string) *BusinessException {
	return NewBusiness(BadRequest, message)
}

// String 便于日志输出。
func (e *BusinessException) String() string {
	return fmt.Sprintf("BusinessException{code=%d, message=%s}", e.Code, e.Message)
}
