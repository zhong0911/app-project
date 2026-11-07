// Package dto 请求入参（对标 Spring Boot 的 dto/）。
package dto

// UserCreateDTO 创建用户入参：以 SSO uid 为身份键。
type UserCreateDTO struct {
	UID string `json:"uid" binding:"required,max=64"`
}

// UserUpdateDTO 更新用户入参：只允许调整本地角色。
type UserUpdateDTO struct {
	ID   uint64 `json:"id" binding:"required"`
	Role string `json:"role" binding:"required,oneof=ADMIN USER admin user"`
}

// UserStatusDTO 启停入参。
type UserStatusDTO struct {
	Status *int `json:"status" binding:"required,oneof=0 1"`
}

// UserQueryDTO 分页查询入参。
type UserQueryDTO struct {
	PageNum  int    `form:"pageNum" binding:"omitempty,min=1"`
	PageSize int    `form:"pageSize" binding:"omitempty,min=1,max=500"`
	UID      string `form:"uid"`
	Role     string `form:"role"`
	Status   *int   `form:"status"`
}

// Normalize 兜底分页默认值（与 Spring 模板默认 1 / 10 一致）。
func (q *UserQueryDTO) Normalize() {
	if q.PageNum < 1 {
		q.PageNum = 1
	}
	if q.PageSize < 1 {
		q.PageSize = 10
	}
	if q.PageSize > 500 {
		q.PageSize = 500
	}
}
