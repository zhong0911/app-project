// Package repository 仓储层（对标 Spring Boot 的 mapper/UserMapper），只做数据库 CRUD。
package repository

import (
	"gorm.io/gorm"

	"github.com/antx/gin-template/internal/model/entity"
)

// UserRepository 用户仓储。
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository 创建用户仓储。
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// FindByID 按主键查询（默认过滤 deleted = 0）。
func (r *UserRepository) FindByID(id uint64, includeDeleted bool) (*entity.User, error) {
	var user entity.User
	tx := r.db.Where("id = ?", id)
	if !includeDeleted {
		tx = tx.Where("deleted = 0")
	}
	if err := tx.First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByUID 按 SSO uid 查询（仅未删除）。
func (r *UserRepository) FindByUID(uid string) (*entity.User, error) {
	var user entity.User
	if err := r.db.Where("uid = ? AND deleted = 0", uid).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByUIDIncludingDeleted 含回收站记录：创建前查重。
func (r *UserRepository) FindByUIDIncludingDeleted(uid string) (*entity.User, error) {
	var user entity.User
	if err := r.db.Where("uid = ?", uid).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// Page 分页查询。
func (r *UserRepository) Page(q PageQuery) ([]entity.User, int64, error) {
	tx := r.db.Model(&entity.User{}).Where("deleted = ?", q.Deleted)
	if q.UID != "" {
		tx = tx.Where("uid = ?", q.UID)
	}
	if q.Role != "" {
		tx = tx.Where("role = ?", q.Role)
	}
	if q.Status != nil {
		tx = tx.Where("status = ?", *q.Status)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var users []entity.User
	err := tx.Order("create_time DESC, id DESC").
		Offset((q.PageNum - 1) * q.PageSize).
		Limit(q.PageSize).
		Find(&users).Error
	return users, total, err
}

// Create 新增用户。
func (r *UserRepository) Create(user *entity.User) error {
	return r.db.Create(user).Error
}

// UpdateRole 更新角色（乐观锁版本号 +1）。
func (r *UserRepository) UpdateRole(id uint64, role string) error {
	return r.db.Model(&entity.User{}).
		Where("id = ? AND deleted = 0", id).
		Updates(map[string]any{"role": role, "version": gorm.Expr("version + 1")}).Error
}

// UpdateStatus 更新启停状态。
func (r *UserRepository) UpdateStatus(id uint64, status int) error {
	return r.db.Model(&entity.User{}).Where("id = ?", id).Update("status", status).Error
}

// SoftDelete 逻辑删除。
func (r *UserRepository) SoftDelete(id uint64) error {
	return r.db.Model(&entity.User{}).Where("id = ? AND deleted = 0", id).Update("deleted", 1).Error
}

// Restore 从回收站恢复。
func (r *UserRepository) Restore(id uint64) error {
	return r.db.Model(&entity.User{}).Where("id = ? AND deleted = 1", id).Update("deleted", 0).Error
}

// Purge 彻底删除。
func (r *UserRepository) Purge(id uint64) error {
	return r.db.Where("id = ? AND deleted = 1", id).Delete(&entity.User{}).Error
}

// PageQuery 分页查询参数。
type PageQuery struct {
	PageNum  int
	PageSize int
	UID      string
	Role     string
	Status   *int
	Deleted  int
}
