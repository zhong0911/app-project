package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/antx/gin-template/internal/model/dto"
	"github.com/antx/gin-template/internal/service"
	"github.com/antx/gin-template/pkg/response"
)

// AdminUserHandler 管理后台用户管理（/api/admin/users，仅管理员）。
type AdminUserHandler struct {
	users *service.UserService
}

// NewAdminUserHandler 创建管理端处理器。
func NewAdminUserHandler(users *service.UserService) *AdminUserHandler {
	return &AdminUserHandler{users: users}
}

// Page 用户列表（不含回收站）。
func (h *AdminUserHandler) Page(c *gin.Context) {
	var req dto.UserQueryDTO
	if !bindQuery(c, &req) {
		return
	}
	result, err := h.users.PageQuery(req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}

// Recycle 回收站列表。
func (h *AdminUserHandler) Recycle(c *gin.Context) {
	var req dto.UserQueryDTO
	if !bindQuery(c, &req) {
		return
	}
	result, err := h.users.PageRecycle(req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}

// Create 添加用户（直接指定 SSO uid）。
func (h *AdminUserHandler) Create(c *gin.Context) {
	var req dto.UserCreateDTO
	if !bindJSON(c, &req) {
		return
	}
	result, err := h.users.CreateUser(req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}

// UpdateStatus 启用 / 禁用。
func (h *AdminUserHandler) UpdateStatus(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var req dto.UserStatusDTO
	if !bindJSON(c, &req) {
		return
	}
	result, err := h.users.UpdateStatus(id, *req.Status)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}

// Delete 软删除（移入回收站）。
func (h *AdminUserHandler) Delete(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	if err := h.users.DeleteUser(id); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(nil))
}

// Restore 从回收站恢复。
func (h *AdminUserHandler) Restore(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	result, err := h.users.Restore(id)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}

// Purge 彻底删除。
func (h *AdminUserHandler) Purge(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	if err := h.users.Purge(id); err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(nil))
}
