import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginApi, getUserInfoApi, logoutApi, getBffMeApi } from '@/api/user'

/**
 * 用户状态示例
 * - 集中管理 token、用户信息
 * - 演示 async action 与 getter 的写法
 * - SSO 登录走 OAuth2 授权码（整页跳转，会话 Cookie 由后端维护）
 */
export const useUserStore = defineStore('user', () => {
  // state
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)

  // getters
  const isLoggedIn = computed(() => !!token.value || !!userInfo.value)
  const displayName = computed(() => userInfo.value?.nickname || userInfo.value?.username || userInfo.value?.name || '')
  // 管理员由后端按 SSO_ADMIN_UID 判定（默认 uid=1），通过 BFF /api/bff/me 下发
  const isAdmin = computed(() => userInfo.value?.isAdmin === true)

  // actions
  async function login(payload) {
    const { data } = await loginApi(payload)
    token.value = data.token
    localStorage.setItem('token', data.token)
    return data
  }

  async function fetchUserInfo() {
    const { data } = await getUserInfoApi()
    userInfo.value = data
    return data
  }

  /**
   * SSO 登录（OAuth2 客户端，全后端统一规范路径）：
   * 整页跳转到后端 /sso/authorize，后端 302 到授权服务器；
   * 授权后回调 /sso/callback 换 token 建会话，再跳回前端首页。
   *
   * @param redirectUri 登录成功后的回跳地址（/login?redirect_uri=xxx 传入）：
   *   暂存 sessionStorage，回到前端且确认已登录后由布局组件完成跳转
   *   （授权回调链路的最终落地地址由后端 sso.login-success-url 决定）
   */
  function loginWithSso(redirectUri = '') {
    if (redirectUri) {
      sessionStorage.setItem('sso_redirect_uri', redirectUri)
    }
    window.location.href = '/sso/authorize'
  }

  /** 拉取 SSO 登录态（BFF 聚合接口；未登录返回 401 时静默忽略） */
  async function fetchLoginUser() {
    try {
      const { data } = await getBffMeApi()
      userInfo.value = data?.uid || data?.name ? data : null
    } catch {
      userInfo.value = null
    }
    return userInfo.value
  }

  /**
   * 单点退出：请求后端 POST /api/auth/logout 销毁服务端会话，
   * 并清除本地凭证（token/用户信息/localStorage）；接口失败（含 401 会话已过期）
   * 不抛出、不弹 toast，仍视为退出成功；
   * 成功时返回后端的 ssoLogoutUrl（配置了 SSO_LOGOUT_URI 时），
   * 由调用方（/logout 页）整页跳转完成 SSO 全局退出。
   */
  async function logout() {
    let ssoLogoutUrl = ''
    try {
      const { data } = await logoutApi()
      ssoLogoutUrl = data?.ssoLogoutUrl || ''
    } catch {
      // 后端退出失败（如会话已过期 401）不影响本地登出
    } finally {
      token.value = ''
      userInfo.value = null
      localStorage.removeItem('token')
    }
    return ssoLogoutUrl
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    displayName,
    isAdmin,
    login,
    fetchUserInfo,
    loginWithSso,
    fetchLoginUser,
    logout,
  }
})
