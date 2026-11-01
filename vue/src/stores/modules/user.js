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
   * 整页跳转到后端 /oauth2/{provider}/authorize，后端 302 到授权服务器；
   * 授权后回调 /oauth2/{provider}/callback 换 token 建会话，再跳回前端首页。
   */
  function loginWithSso(provider = 'sso') {
    window.location.href = `/oauth2/${provider}/authorize`
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

  async function logout() {
    try {
      await logoutApi()
    } finally {
      token.value = ''
      userInfo.value = null
      localStorage.removeItem('token')
    }
  }

  return { token, userInfo, isLoggedIn, displayName, login, fetchUserInfo, loginWithSso, fetchLoginUser, logout }
})
