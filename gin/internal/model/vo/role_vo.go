package vo

import (
	"time"

	"github.com/antx/gin-template/internal/model/entity"
)

// RoleVO 角色出参（隐藏实体内部字段）。
type RoleVO struct {
	ID          uint64    `json:"id"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	BuiltIn     int       `json:"builtIn"`
	Status      int       `json:"status"`
	Sort        int       `json:"sort"`
	CreateTime  time.Time `json:"createTime"`
	UpdateTime  time.Time `json:"updateTime"`
}

// ToRoleVO 实体转 VO。
func ToRoleVO(r *entity.Role) *RoleVO {
	if r == nil {
		return nil
	}
	return &RoleVO{
		ID:          r.ID,
		Code:        r.Code,
		Name:        r.Name,
		Description: r.Description,
		BuiltIn:     r.BuiltIn,
		Status:      r.Status,
		Sort:        r.Sort,
		CreateTime:  r.CreateTime,
		UpdateTime:  r.UpdateTime,
	}
}

// ToRoleVOList 实体列表转 VO 列表。
func ToRoleVOList(roles []entity.Role) []RoleVO {
	result := make([]RoleVO, 0, len(roles))
	for i := range roles {
		result = append(result, *ToRoleVO(&roles[i]))
	}
	return result
}
