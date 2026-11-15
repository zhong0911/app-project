package dto

// RoleDTO 角色新增 / 更新入参（编码统一大写，只允许字母、数字与下划线）。
type RoleDTO struct {
	Code        string  `json:"code" binding:"required,min=2,max=32"`
	Name        string  `json:"name" binding:"required,max=64"`
	Description *string `json:"description" binding:"omitempty,max=255"`
	Status      *int    `json:"status" binding:"omitempty,oneof=0 1"`
	Sort        *int    `json:"sort"`
}

// RoleQueryDTO 角色列表查询入参。
type RoleQueryDTO struct {
	IncludeDisabled bool `form:"includeDisabled"`
}
