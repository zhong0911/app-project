package entity

import "time"

// Role 角色实体（对应表 roles）。
//
// 子应用本地角色字典：内置 ADMIN / USER（built_in=1，不可删除、不可改编码），
// 可新增自定义角色；users.role 引用这里的 code。
type Role struct {
	ID          uint64    `gorm:"column:id;primaryKey;autoIncrement" json:"id"`
	Code        string    `gorm:"column:code;size:32;uniqueIndex:uk_code;not null" json:"code"`
	Name        string    `gorm:"column:name;size:64;not null" json:"name"`
	Description *string   `gorm:"column:description;size:255" json:"description"`
	BuiltIn     int       `gorm:"column:built_in;not null;default:0" json:"builtIn"`
	Status      int       `gorm:"column:status;not null;default:1" json:"status"`
	Sort        int       `gorm:"column:sort;not null;default:0" json:"sort"`
	CreateTime  time.Time `gorm:"column:create_time;autoCreateTime" json:"createTime"`
	UpdateTime  time.Time `gorm:"column:update_time;autoUpdateTime" json:"updateTime"`
}

// TableName 指定表名。
func (Role) TableName() string { return "roles" }
