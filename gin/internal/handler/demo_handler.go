package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/antx/gin-template/internal/middleware"
	"github.com/antx/gin-template/pkg/response"
)

// DemoHandler 角色示例接口（/api/demo）。
type DemoHandler struct{}

// NewDemoHandler 创建示例处理器。
func NewDemoHandler() *DemoHandler { return &DemoHandler{} }

// AdminOnly 仅管理员可访问。
func (h *DemoHandler) AdminOnly(c *gin.Context) {
	principal := middleware.CurrentPrincipal(c)
	c.JSON(http.StatusOK, response.Success(fmt.Sprintf("你好，管理员 %s", principal.Name)))
}

// AnyLoginUser 已登录用户可访问。
func (h *DemoHandler) AnyLoginUser(c *gin.Context) {
	principal := middleware.CurrentPrincipal(c)
	c.JSON(http.StatusOK, response.Success(fmt.Sprintf("你好，%s", principal.Name)))
}
