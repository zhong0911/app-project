package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/antx/gin-template/internal/errno"
	"github.com/antx/gin-template/internal/model/dto"
	"github.com/antx/gin-template/internal/service"
	"github.com/antx/gin-template/pkg/response"
)

// UserHandler 用户接口（/api/users，需登录）。
type UserHandler struct {
	users *service.UserService
}

// NewUserHandler 创建用户处理器。
func NewUserHandler(users *service.UserService) *UserHandler {
	return &UserHandler{users: users}
}

// Create 创建用户。
func (h *UserHandler) Create(c *gin.Context) {
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

// Update 调整角色。
func (h *UserHandler) Update(c *gin.Context) {
	var req dto.UserUpdateDTO
	if !bindJSON(c, &req) {
		return
	}
	result, err := h.users.UpdateUser(req)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}

// Delete 逻辑删除。
func (h *UserHandler) Delete(c *gin.Context) {
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

// Detail 用户详情。
func (h *UserHandler) Detail(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	result, err := h.users.GetUser(id)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, response.Success(result))
}

// Page 分页查询。
func (h *UserHandler) Page(c *gin.Context) {
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

// parseID 解析路径参数 id。
func parseID(c *gin.Context) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusOK, response.Error(errno.CodeBadRequest, "用户 ID 不合法"))
		return 0, false
	}
	return id, true
}
