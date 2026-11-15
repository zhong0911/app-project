package service

import (
	"errors"
	"regexp"
	"strings"

	"gorm.io/gorm"

	"github.com/antx/gin-template/internal/errno"
	"github.com/antx/gin-template/internal/model/dto"
	"github.com/antx/gin-template/internal/model/entity"
	"github.com/antx/gin-template/internal/model/vo"
	"github.com/antx/gin-template/internal/repository"
)

// roleCodePattern 角色编码规则（与前端 CODE_PATTERN、Spring Boot RoleDTO 一致）。
var roleCodePattern = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_]{1,31}$`)

// RoleService 角色业务服务（对标 Spring Boot 的 service/impl/RoleServiceImpl）。
//
// 规则：
//   - 编码统一去空格转大写，只允许字母开头、字母/数字/下划线，长度 2-32；
//   - 内置角色（built_in=1）不可删除、不可改编码；
//   - 仍被用户引用的角色不允许删除。
type RoleService struct {
	repo *repository.RoleRepository
}

// NewRoleService 创建角色服务。
func NewRoleService(repo *repository.RoleRepository) *RoleService {
	return &RoleService{repo: repo}
}

// ListRoles 角色列表。
func (s *RoleService) ListRoles(includeDisabled bool) ([]vo.RoleVO, error) {
	roles, err := s.repo.List(includeDisabled)
	if err != nil {
		return nil, err
	}
	return vo.ToRoleVOList(roles), nil
}

// CreateRole 新增角色（新角色 built_in 固定为 0）。
func (s *RoleService) CreateRole(req dto.RoleDTO) (*vo.RoleVO, error) {
	code, err := s.normalizeCode(req.Code)
	if err != nil {
		return nil, err
	}
	if _, findErr := s.repo.FindByCode(code); findErr == nil {
		return nil, errno.Conflict("角色编码已存在: " + code)
	} else if !errors.Is(findErr, gorm.ErrRecordNotFound) {
		return nil, findErr
	}

	role := &entity.Role{
		Code:        code,
		Name:        strings.TrimSpace(req.Name),
		Description: normalizeDescription(req.Description),
		BuiltIn:     0,
		Status:      1,
		Sort:        0,
	}
	if req.Status != nil {
		role.Status = *req.Status
	}
	if req.Sort != nil {
		role.Sort = *req.Sort
	}
	if err := s.repo.Create(role); err != nil {
		return nil, err
	}
	return vo.ToRoleVO(role), nil
}

// UpdateRole 更新角色（内置角色编码不可改）。
func (s *RoleService) UpdateRole(id uint64, req dto.RoleDTO) (*vo.RoleVO, error) {
	role, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errno.NotFound("角色不存在")
		}
		return nil, err
	}

	code, err := s.normalizeCode(req.Code)
	if err != nil {
		return nil, err
	}

	// 内置角色编码固定，避免改坏已有用户的角色关联
	if role.BuiltIn == 1 && role.Code != code {
		return nil, errno.BadRequest("内置角色编码不可修改: " + role.Code)
	}
	if role.Code != code {
		if _, findErr := s.repo.FindByCode(code); findErr == nil {
			return nil, errno.Conflict("角色编码已存在: " + code)
		} else if !errors.Is(findErr, gorm.ErrRecordNotFound) {
			return nil, findErr
		}
	}

	role.Code = code
	role.Name = strings.TrimSpace(req.Name)
	if req.Description != nil {
		role.Description = normalizeDescription(req.Description)
	}
	if req.Status != nil {
		role.Status = *req.Status
	}
	if req.Sort != nil {
		role.Sort = *req.Sort
	}
	if err := s.repo.Update(role); err != nil {
		return nil, err
	}
	return vo.ToRoleVO(role), nil
}

// DeleteRole 删除角色（内置角色、仍被用户使用的角色不可删）。
func (s *RoleService) DeleteRole(id uint64) error {
	role, err := s.repo.FindByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errno.NotFound("角色不存在")
		}
		return err
	}
	if role.BuiltIn == 1 {
		return errno.BadRequest("内置角色不可删除: " + role.Code)
	}

	used, err := s.repo.CountUsersByCode(role.Code)
	if err != nil {
		return err
	}
	if used > 0 {
		return errno.Conflict("仍有用户在引用该角色，请先调整用户角色: " + role.Code)
	}

	return s.repo.Delete(id)
}

// normalizeCode 角色编码归一化并校验。
func (s *RoleService) normalizeCode(code string) (string, error) {
	normalized := strings.ToUpper(strings.TrimSpace(code))
	if !roleCodePattern.MatchString(normalized) {
		return "", errno.BadRequest("角色编码只允许字母、数字与下划线，长度 2-32")
	}
	return normalized, nil
}

// normalizeDescription 描述空串统一存 NULL。
func normalizeDescription(description *string) *string {
	if description == nil {
		return nil
	}
	text := strings.TrimSpace(*description)
	if text == "" {
		return nil
	}
	return &text
}
