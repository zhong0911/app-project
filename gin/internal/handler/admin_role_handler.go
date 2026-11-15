package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/antx/gin-template/internal/errno"
	"github.com/antx/gin-template/internal/model/dto"
	"github.com/antx/gin-template/internal/service"
	"github.com/antx/gin-template/pkg/response"
)

// AdminRoleHandler 管理后台角色字典（/api/admin/roles，仅管理员）。
type AdminRoleHandler struct {
	roles *service.RoleService
}

// NewAdminRoleHandler 创建管理端角色处理器。
func NewAdminRoleHandler(roles *service.RoleService) *AdminRoleHandler {
	return &AdminRoleHandler{roles: roles}
}

// List 角色列表（默认只返回启用角色，includeDisabled=true 返回全部）。
func (h *AdminRoleHandler) List(c *gin.Context) {
	var req dto.RoleQueryDTO
	if !bindQuery(c, &req) {
		return
	}
	result, err := h.roles.ListRoles(req.IncludeDisabled)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}

// Create 新增角色。
func (h *AdminRoleHandler) Create(c *gin.Context) {
	var req dto.RoleDTO
	if !bindJSON(c, &req) {
		return
	}
	result, err := h.roles.CreateRole(req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}

// Update 更新角色（内置角色编码不可改）。
func (h *AdminRoleHandler) Update(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var req dto.RoleDTO
	if !bindJSON(c, &req) {
		return
	}
	result, err := h.roles.UpdateRole(id, req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}

// Delete 删除角色（内置角色、仍被用户使用的角色不可删）。
func (h *AdminRoleHandler) Delete(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	if err := h.roles.DeleteRole(id); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(nil))
}

// parseID 解析路径参数 id，非法时直接返回统一 400。
func parseID(c *gin.Context) (uint64, bool) {
	id, err := strconv.ParseUint(strings.TrimSpace(c.Param("id")), 10, 64)
	if err != nil || id == 0 {
		c.JSON(errno.HTTPStatus(errno.CodeBadRequest), response.Error(errno.CodeBadRequest, "角色 ID 不合法"))
		return 0, false
	}
	return id, true
}
