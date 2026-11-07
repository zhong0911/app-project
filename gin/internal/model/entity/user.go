package entity

import "time"

// User 用户实体（对应表 users）。
//
// 表 users 以 SSO uid 为身份键：用户名/昵称/邮箱由 SSO 提供，本地只维护角色、启停、软删除。
type User struct {
	ID         uint64    `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	UID        string    `gorm:"column:uid;size:64;uniqueIndex:uk_uid;not null" json:"uid"`
	Role       string    `gorm:"column:role;size:20;not null;default:USER" json:"role"`
	Status     int       `gorm:"column:status;not null;default:1" json:"status"`
	Deleted    int       `gorm:"column:deleted;not null;default:0;index:idx_deleted_create_time,priority:1" json:"deleted"`
	Version    int       `gorm:"column:version;not null;default:1" json:"version"`
	CreateTime time.Time `gorm:"column:create_time;autoCreateTime" json:"createTime"`
	UpdateTime time.Time `gorm:"column:update_time;autoUpdateTime" json:"updateTime"`
}

// TableName 指定表名。
func (User) TableName() string { return "users" }
