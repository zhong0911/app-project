import request from '@/api/request'

/**
 * 用户相关接口示例
 * 所有接口均基于 api/request.js 的 axios 实例
 */
export function loginApi(data) {
  return request.post('/auth/login', data)
}

export function getUserInfoApi() {
  return request.get('/user/info')
}

export function logoutApi() {
  return request.post('/auth/logout')
}

/**
 * BFF 聚合登录态（SSO 身份 + 子应用角色，见 springboot BffController）
 * 未登录时后端返回 401，由调用方捕获
 */
export function getBffMeApi() {
  return request.get('/bff/me')
}
