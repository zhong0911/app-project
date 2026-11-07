import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logoutApi, getBffMeApi } from '@/api/user'
import { broadcastAuth, onAuthBroadcast, readRedirectUri, clearRedirectUri, saveRedirectUri } from '@/utils/auth'

/**
 * 用户状态
 * - 登录态来自后端 SSO 会话（Cookie），前端不保存 token
 * - 用户信息由 BFF /api/bff/me 聚合下发
 * - SSO 登录走 OAuth2 授权码（整页跳转）
 * - 多标签页同步：登录/退出时通过 localStorage 广播，其他标签页自动跟随
 */
export const useUserStore = defineStore('user', () => {
  // state
  const userInfo = ref(null)

  // getters
  const isLoggedIn = computed(() => !!userInfo.value)
  const displayName = computed(() => userInfo.value?.nickname || userInfo.value?.username || userInfo.value?.name || '')
  // 管理员由后端按 SSO_ADMIN_UID 判定（默认 uid=1），通过 BFF /api/bff/me 下发
  const isAdmin = computed(() => userInfo.value?.isAdmin === true)

  // 清空本地登录态（不发请求、不跳转；跳转由调用方决定）
  function clearUser() {
    userInfo.value = null
  }

  /**
   * SSO 登录（OAuth2 客户端，全后端统一规范路径）：
   * 整页跳转到后端 /sso/authorize，后端 302 到授权服务器；
   * 授权后回调 /sso/callback 换 token 建会话，再 302 回前端页面。
   *
   * @param redirectUri 登录成功后的回跳地址（/login?redirect_uri=xxx 传入，缺省 '/'）：
   *   1. 转成绝对地址（当前前端源 + 路径）作为 query 参数透传给后端，后端存会话、
   *      回调成功后直接跳过去；后端按 CORS 允许来源校验 origin，不依赖 Location 相对路径的解析规则；
   *   2. 同时存 localStorage（带 30 分钟过期，见 utils/auth.js），
   *      作为兜底：授权链路没带回跳地址时由登录页 / 布局消费一次。
   */
  function loginWithSso(redirectUri = '') {
    const target = redirectUri || '/'
    saveRedirectUri(target)
    const absolute = /^https?:\/\//i.test(target) ? target : `${window.location.origin}${target}`
    window.location.href = `/sso/authorize?redirect_uri=${encodeURIComponent(absolute)}`
  }

  /** 拉取 SSO 登录态（BFF 聚合接口；未登录返回 401 时静默忽略） */
  let fetchPromise = null
  async function fetchLoginUser(force = false) {
    if (!force && userInfo.value) {
      return userInfo.value
    }
    // 并发去重：路由守卫与布局挂载可能同时触发，避免重复请求 /bff/me
    if (fetchPromise) {
      return fetchPromise
    }
    fetchPromise = (async () => {
      try {
        const { data } = await getBffMeApi()
        userInfo.value = data?.uid || data?.name ? data : null
      } catch {
        userInfo.value = null
      }
      return userInfo.value
    })().finally(() => {
      fetchPromise = null
    })
    return fetchPromise
  }

  /**
   * 单点退出：请求后端 POST /api/auth/logout 销毁服务端会话，
   * 清除本地用户信息与回跳地址，并通知其他标签页同步退出；
   * 接口失败（含 401 会话已过期）不抛出、不弹 toast，仍视为退出成功；
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
      userInfo.value = null
      clearRedirectUri()
      broadcastAuth('logout')
    }
    return ssoLogoutUrl
  }

  /**
   * 登录态失效（接口层 401 通知）：清空本地状态并广播，避免其他标签页仍显示已登录。
   * 跳转到登录页由 router 负责（它才知道当前路由）。
   */
  function markLoggedOut() {
    const wasLoggedIn = !!userInfo.value
    userInfo.value = null
    clearRedirectUri()
    if (wasLoggedIn) {
      broadcastAuth('logout')
    }
  }

  // 登录成功后广播（布局/登录页确认已登录时调用，其他标签页据此刷新）
  function markLoggedIn() {
    if (userInfo.value) {
      broadcastAuth('login')
    }
  }

  // 订阅其他标签页的登录态变化（store 初始化时注册一次）
  if (typeof window !== 'undefined') {
    onAuthBroadcast((type) => {
      if (type === 'logout') {
        userInfo.value = null
      } else if (type === 'login' && !userInfo.value) {
        fetchLoginUser(true)
      }
    })
  }

  return {
    userInfo,
    isLoggedIn,
    displayName,
    isAdmin,
    loginWithSso,
    fetchLoginUser,
    logout,
    clearUser,
    markLoggedOut,
    markLoggedIn,
    // 透传回跳地址读写，页面层不必再关心存储细节
    readRedirectUri,
    clearRedirectUri,
  }
})
