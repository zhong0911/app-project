import request from '@/api/request'

/**
 * 管理后台用户管理接口（仅管理员可访问，四后端统一契约）
 *
 * 用户唯一标识为 SSO uid（access_token 的 sub）；删除均为软删除（进入回收站）。
 */
export function getAdminUsersApi(params) {
  return request.get('/admin/users', { params })
}

export function createAdminUserApi(data) {
  return request.post('/admin/users', data)
}

export function updateAdminUserStatusApi(id, status) {
  return request.put(`/admin/users/${id}/status`, { status })
}

/** 软删除（移入回收站） */
export function deleteAdminUserApi(id) {
  return request.delete(`/admin/users/${id}`)
}

export function getAdminRecycleApi(params) {
  return request.get('/admin/users/recycle', { params })
}

export function restoreAdminUserApi(id) {
  return request.post(`/admin/users/${id}/restore`)
}

/** 彻底删除（仅回收站中的用户） */
export function purgeAdminUserApi(id) {
  return request.delete(`/admin/users/${id}/purge`)
}
