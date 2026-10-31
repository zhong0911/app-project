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
