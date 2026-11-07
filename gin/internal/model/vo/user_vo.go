// Package vo 响应出参（对标 Spring Boot 的 vo/）。
package vo

import (
	"time"

	"github.com/antx/gin-template/internal/model/entity"
)

// UserVO 用户出参（隐藏 version 等内部字段）。
type UserVO struct {
	ID         uint64    `json:"id"`
	UID        string    `json:"uid"`
	Role       string    `json:"role"`
	Status     int       `json:"status"`
	Deleted    int       `json:"deleted"`
	CreateTime time.Time `json:"createTime"`
	UpdateTime time.Time `json:"updateTime"`
}

// BffUserVO BFF 聚合出参：面向前端的登录态视图。
type BffUserVO struct {
	AuthType string `json:"authType,omitempty"`
	UID      string `json:"uid,omitempty"`
	LocalID  uint64 `json:"localId,omitempty"`
	Role     string `json:"role,omitempty"`
	IsAdmin  bool   `json:"isAdmin"`
	Status   *int   `json:"status,omitempty"`
	Name     string `json:"name,omitempty"`
}

// ToUserVO 实体转 VO。
func ToUserVO(u *entity.User) *UserVO {
	if u == nil {
		return nil
	}
	return &UserVO{
		ID:         u.ID,
		UID:        u.UID,
		Role:       u.Role,
		Status:     u.Status,
		Deleted:    u.Deleted,
		CreateTime: u.CreateTime,
		UpdateTime: u.UpdateTime,
	}
}

// ToUserVOList 实体列表转 VO 列表。
func ToUserVOList(users []entity.User) []UserVO {
	result := make([]UserVO, 0, len(users))
	for i := range users {
		result = append(result, *ToUserVO(&users[i]))
	}
	return result
}
