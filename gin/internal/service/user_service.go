// Package service 业务层（对标 Spring Boot 的 service/impl/UserServiceImpl）。
package service

import (
	"errors"
	"strings"

	"gorm.io/gorm"

	"github.com/antx/gin-template/internal/errno"
	"github.com/antx/gin-template/internal/model/dto"
	"github.com/antx/gin-template/internal/model/entity"
	"github.com/antx/gin-template/internal/model/vo"
	"github.com/antx/gin-template/internal/repository"
	"github.com/antx/gin-template/pkg/response"
)

// UserService 用户业务服务。
type UserService struct {
	repo     *repository.UserRepository
	adminUID string
}

// NewUserService 创建用户服务。
func NewUserService(repo *repository.UserRepository, adminUID string) *UserService {
	return &UserService{repo: repo, adminUID: adminUID}
}

// CreateUser 创建用户（新用户默认 USER）。
func (s *UserService) CreateUser(req dto.UserCreateDTO) (*vo.UserVO, error) {
	if _, err := s.repo.FindByUIDIncludingDeleted(req.UID); err == nil {
		return nil, errno.Conflict("SSO 用户已存在或已在回收站: " + req.UID)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// 管理员由 SSO_ADMIN_UID 配置决定（见 IsAdmin），本地角色直接落 ADMIN
	role := "USER"
	if s.IsAdmin(req.UID) {
		role = "ADMIN"
	}
	user := &entity.User{UID: req.UID, Role: role, Status: 1, Deleted: 0, Version: 1}
	if err := s.repo.Create(user); err != nil {
		return nil, err
	}
	return vo.ToUserVO(user), nil
}

// UpdateUser 调整角色。
func (s *UserService) UpdateUser(req dto.UserUpdateDTO) (*vo.UserVO, error) {
	user, err := s.repo.FindByID(req.ID, false)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errno.NotFound("用户不存在")
		}
		return nil, err
	}

	role := strings.ToUpper(req.Role)
	if role != "ADMIN" && role != "USER" {
		return nil, errno.BadRequest("角色不合法，仅支持 ADMIN / USER")
	}
	if err := s.repo.UpdateRole(req.ID, role); err != nil {
		return nil, err
	}
	user.Role = role
	return vo.ToUserVO(user), nil
}

// DeleteUser 逻辑删除。
func (s *UserService) DeleteUser(id uint64) error {
	if _, err := s.repo.FindByID(id, false); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errno.NotFound("用户不存在")
		}
		return err
	}
	return s.repo.SoftDelete(id)
}

// GetUser 用户详情。
func (s *UserService) GetUser(id uint64) (*vo.UserVO, error) {
	user, err := s.repo.FindByID(id, false)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errno.NotFound("用户不存在")
		}
		return nil, err
	}
	return vo.ToUserVO(user), nil
}

// PageQuery 分页查询。
func (s *UserService) PageQuery(req dto.UserQueryDTO) (response.PageResult, error) {
	req.Normalize()
	users, total, err := s.repo.Page(repository.PageQuery{
		PageNum: req.PageNum, PageSize: req.PageSize,
		UID: req.UID, Role: req.Role, Status: req.Status, Deleted: 0,
	})
	if err != nil {
		return response.PageResult{}, err
	}
	return response.NewPageResult(req.PageNum, req.PageSize, total, vo.ToUserVOList(users)), nil
}

// PageRecycle 回收站分页。
func (s *UserService) PageRecycle(req dto.UserQueryDTO) (response.PageResult, error) {
	req.Normalize()
	users, total, err := s.repo.Page(repository.PageQuery{
		PageNum: req.PageNum, PageSize: req.PageSize,
		UID: req.UID, Status: req.Status, Deleted: 1,
	})
	if err != nil {
		return response.PageResult{}, err
	}
	return response.NewPageResult(req.PageNum, req.PageSize, total, vo.ToUserVOList(users)), nil
}

// UpdateStatus 启停。
func (s *UserService) UpdateStatus(id uint64, status int) (*vo.UserVO, error) {
	if status != 0 && status != 1 {
		return nil, errno.BadRequest("状态仅支持 0-禁用 / 1-启用")
	}
	if _, err := s.repo.FindByID(id, true); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errno.NotFound("用户不存在")
		}
		return nil, err
	}
	if err := s.repo.UpdateStatus(id, status); err != nil {
		return nil, err
	}
	user, err := s.repo.FindByID(id, true)
	if err != nil {
		return nil, err
	}
	return vo.ToUserVO(user), nil
}

// Restore 从回收站恢复。
func (s *UserService) Restore(id uint64) (*vo.UserVO, error) {
	user, err := s.repo.FindByID(id, true)
	if err != nil || user.Deleted != 1 {
		return nil, errno.NotFound("回收站中不存在该用户")
	}
	if err := s.repo.Restore(id); err != nil {
		return nil, err
	}
	user.Deleted = 0
	return vo.ToUserVO(user), nil
}

// Purge 彻底删除。
func (s *UserService) Purge(id uint64) error {
	user, err := s.repo.FindByID(id, true)
	if err != nil || user.Deleted != 1 {
		return errno.NotFound("回收站中不存在该用户")
	}
	return s.repo.Purge(id)
}

// GetByUID 按 SSO uid 查本地用户，未注册返回 nil。
func (s *UserService) GetByUID(uid string) *entity.User {
	if uid == "" {
		return nil
	}
	user, err := s.repo.FindByUID(uid)
	if err != nil {
		return nil
	}
	return user
}

// GetOrCreateDefaultUser 新登录用户默认注册为 USER；配置的管理员直接 ADMIN。
func (s *UserService) GetOrCreateDefaultUser(uid string) *entity.User {
	if uid == "" {
		return nil
	}
	if existing := s.GetByUID(uid); existing != nil {
		// 已有记录与管理员配置不一致时顺手纠正角色
		if s.IsAdmin(uid) && existing.Role != "ADMIN" {
			if err := s.repo.UpdateRole(existing.ID, "ADMIN"); err == nil {
				existing.Role = "ADMIN"
			}
		}
		return existing
	}
	if user, err := s.repo.FindByUIDIncludingDeleted(uid); err == nil {
		return user
	}
	role := "USER"
	if s.IsAdmin(uid) {
		role = "ADMIN"
	}
	user := &entity.User{UID: uid, Role: role, Status: 1, Deleted: 0, Version: 1}
	if err := s.repo.Create(user); err != nil {
		// 并发唯一键冲突：查回已有记录
		if existing := s.GetByUID(uid); existing != nil {
			return existing
		}
		return nil
	}
	return user
}

// IsAdmin 是否管理员（由 SSO_ADMIN_UID 配置决定）。
func (s *UserService) IsAdmin(uid string) bool {
	return uid != "" && uid == s.adminUID
}

// RequireAdmin 管理接口鉴权：未登录 401，非管理员 403，被禁用 403。
func (s *UserService) RequireAdmin(uid string) (string, error) {
	if uid == "" {
		return "", errno.Unauthorized()
	}
	if !s.IsAdmin(uid) {
		return "", errno.Forbidden("仅管理员可访问")
	}
	if local := s.GetByUID(uid); local != nil && local.Status == 0 {
		return "", errno.Forbidden("账号已被禁用")
	}
	return uid, nil
}
