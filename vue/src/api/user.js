import request from '@/api/request'

/**
 * 用户相关接口
 * 登录态由后端 SSO 会话 Cookie 维护，前端不持有 token
 */
export function logoutApi() {
  // skipErrorToast：退出接口失败（含 401 会话已过期）不弹 toast，由 /logout 页直接展示退出成功
  return request.post('/auth/logout', null, { skipErrorToast: true })
}

/**
 * BFF 聚合登录态（SSO 身份 + 子应用角色，见 springboot BffController）
 * 未登录时后端返回 401，由调用方捕获
 */
export function getBffMeApi() {
  // 首页/后台挂载时都会探测登录态，未登录的 401 属于正常情况，不弹 toast
  return request.get('/bff/me', { skipErrorToast: true })
}
