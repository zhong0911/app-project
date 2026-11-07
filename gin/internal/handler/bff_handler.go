package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/antx/gin-template/internal/middleware"
	"github.com/antx/gin-template/internal/model/vo"
	"github.com/antx/gin-template/internal/service"
	"github.com/antx/gin-template/pkg/config"
	"github.com/antx/gin-template/pkg/response"
)

// BffHandler BFF 聚合接口（/api/bff/me）。
type BffHandler struct {
	cfg   *config.Config
	users *service.UserService
}

// NewBffHandler 创建 BFF 处理器。
func NewBffHandler(cfg *config.Config, users *service.UserService) *BffHandler {
	return &BffHandler{cfg: cfg, users: users}
}

// Me 聚合登录态：SSO 身份 + 本地角色。
func (h *BffHandler) Me(c *gin.Context) {
	principal := middleware.CurrentPrincipal(c)
	if principal.UID == "" {
		c.JSON(http.StatusOK, response.Success(vo.BffUserVO{}))
		return
	}

	uid := principal.UID
	out := vo.BffUserVO{
		AuthType: principal.AuthType,
		UID:      uid,
		Name:     principal.Name,
		IsAdmin:  h.users.IsAdmin(uid),
	}

	// 聚合本地角色 / 启停状态（未注册则无角色）
	if local := h.users.GetByUID(uid); local != nil {
		out.LocalID = local.ID
		out.Role = local.Role
		status := local.Status
		out.Status = &status
	}

	c.JSON(http.StatusOK, response.Success(out))
}
