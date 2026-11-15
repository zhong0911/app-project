package repository

import (
	"gorm.io/gorm"

	"github.com/antx/gin-template/internal/model/entity"
)

// RoleRepository 角色仓储（对标 Spring Boot 的 mapper/RoleMapper），只做数据库 CRUD。
type RoleRepository struct {
	db *gorm.DB
}

// NewRoleRepository 创建角色仓储。
func NewRoleRepository(db *gorm.DB) *RoleRepository {
	return &RoleRepository{db: db}
}

// List 角色列表：默认只给启用角色，includeDisabled=true 时返回全部（按 sort、id 升序）。
func (r *RoleRepository) List(includeDisabled bool) ([]entity.Role, error) {
	tx := r.db.Model(&entity.Role{})
	if !includeDisabled {
		tx = tx.Where("status = 1")
	}
	var roles []entity.Role
	if err := tx.Order("sort ASC, id ASC").Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

// FindByID 按主键查询。
func (r *RoleRepository) FindByID(id uint64) (*entity.Role, error) {
	var role entity.Role
	if err := r.db.Where("id = ?", id).First(&role).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

// FindByCode 按角色编码查询。
func (r *RoleRepository) FindByCode(code string) (*entity.Role, error) {
	var role entity.Role
	if err := r.db.Where("code = ?", code).First(&role).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

// Create 新增角色。
func (r *RoleRepository) Create(role *entity.Role) error {
	return r.db.Create(role).Error
}

// Update 更新角色（全字段保存）。
func (r *RoleRepository) Update(role *entity.Role) error {
	return r.db.Save(role).Error
}

// Delete 删除角色。
func (r *RoleRepository) Delete(id uint64) error {
	return r.db.Delete(&entity.Role{}, id).Error
}

// CountUsersByCode 仍在引用该角色编码的用户数（>0 时不允许删除角色）。
func (r *RoleRepository) CountUsersByCode(code string) (int64, error) {
	var total int64
	err := r.db.Model(&entity.User{}).Where("role = ?", code).Count(&total).Error
	return total, err
}
