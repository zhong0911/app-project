import request from '@/api/request'

/**
 * 管理后台用户管理接口（仅管理员可访问，四后端统一契约）
 *
 * 用户唯一标识为 SSO uid（access_token 的 sub）；删除均为软删除（进入回收站）。
 */
// key：同 key 的新请求会取消上一个（翻页/筛选连续点击时不出现旧响应覆盖新数据）
export function getAdminUsersApi(params) {
  return request.get('/admin/users', { params, key: 'admin-users' })
}

export function createAdminUserApi(data) {
  return request.post('/admin/users', data)
}

export function updateAdminUserStatusApi(id, status) {
  return request.put(`/admin/users/${id}/status`, { status })
}

/** 编辑用户（当前仅调整本地角色） */
export function updateAdminUserApi(id, data) {
  return request.put(`/admin/users/${id}`, data)
}

/** 角色列表（角色管理，内置 ADMIN / USER） */
export function getAdminRolesApi(params) {
  return request.get('/admin/roles', { params, key: 'admin-roles' })
}

/** 新增角色 */
export function createAdminRoleApi(data) {
  return request.post('/admin/roles', data)
}

/** 更新角色（内置角色编码不可改） */
export function updateAdminRoleApi(id, data) {
  return request.put(`/admin/roles/${id}`, data)
}

/** 删除角色（内置角色、仍被用户使用的角色不允许删除） */
export function deleteAdminRoleApi(id) {
  return request.delete(`/admin/roles/${id}`)
}

/** 软删除（移入回收站） */
export function deleteAdminUserApi(id) {
  return request.delete(`/admin/users/${id}`)
}

export function getAdminRecycleApi(params) {
  return request.get('/admin/users/recycle', { params, key: 'admin-users-recycle' })
}

export function restoreAdminUserApi(id) {
  return request.post(`/admin/users/${id}/restore`)
}

/** 彻底删除（仅回收站中的用户） */
export function purgeAdminUserApi(id) {
  return request.delete(`/admin/users/${id}/purge`)
}
