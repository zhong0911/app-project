// Package handler 控制器层（对标 Spring Boot 的 controller/），只做请求解析与响应，不写业务。
package handler

import (
	"errors"
	"log"

	"github.com/gin-gonic/gin"

	"github.com/antx/gin-template/internal/errno"
	"github.com/antx/gin-template/pkg/response"
)

// writeError 把业务异常 / 其他异常统一转成五字段响应（HTTP 固定 200）。
func writeError(c *gin.Context, err error) {
	var bizErr *errno.BusinessError
	if errors.As(err, &bizErr) {
		c.JSON(200, response.Error(bizErr.Code, bizErr.Message))
		return
	}

	log.Printf("[error] %v", err)
	c.JSON(200, response.Error(errno.CodeInternalError, errno.Message[errno.CodeInternalError]))
}

// bindJSON 解析 JSON body，失败返回统一 400。
func bindJSON(c *gin.Context, target any) bool {
	if err := c.ShouldBindJSON(target); err != nil {
		c.JSON(200, response.Error(errno.CodeBadRequest, "请求参数错误: "+err.Error()))
		return false
	}
	return true
}

// bindQuery 解析 query 参数，失败返回统一 400。
func bindQuery(c *gin.Context, target any) bool {
	if err := c.ShouldBindQuery(target); err != nil {
		c.JSON(200, response.Error(errno.CodeBadRequest, "请求参数错误: "+err.Error()))
		return false
	}
	return true
}
