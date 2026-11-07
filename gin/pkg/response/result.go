// Package response 统一响应体（对标 Spring Boot 的 Result / PageResult）。
package response

import "time"

// Result 五字段统一响应。
type Result struct {
	Code      int    `json:"code"`
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	Data      any    `json:"data"`
	Timestamp int64  `json:"timestamp"`
}

// PageResult 分页载体。
type PageResult struct {
	PageNum  int   `json:"pageNum"`
	PageSize int   `json:"pageSize"`
	Total    int64 `json:"total"`
	Pages    int64 `json:"pages"`
	Records  any   `json:"records"`
}

// NewPageResult 构造分页结果。
func NewPageResult(pageNum, pageSize int, total int64, records any) PageResult {
	pages := int64(0)
	if pageSize > 0 {
		pages = (total + int64(pageSize) - 1) / int64(pageSize)
	}
	return PageResult{PageNum: pageNum, PageSize: pageSize, Total: total, Pages: pages, Records: records}
}

// Success 成功响应。
func Success(data any) Result {
	return Result{Code: 200, Success: true, Message: "操作成功", Data: data, Timestamp: time.Now().UnixMilli()}
}

// SuccessMessage 带自定义提示的成功响应。
func SuccessMessage(message string, data any) Result {
	return Result{Code: 200, Success: true, Message: message, Data: data, Timestamp: time.Now().UnixMilli()}
}

// Error 失败响应。
func Error(code int, message string) Result {
	return Result{Code: code, Success: false, Message: message, Data: nil, Timestamp: time.Now().UnixMilli()}
}
