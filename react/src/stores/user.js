import { create } from 'zustand'

import { getBffMeApi, logoutApi } from '@/api/user'
import {
  broadcastAuth,
  buildAuthorizeUrl,
  clearRedirectUri,
  normalizeRedirectUri,
  onAuthBroadcast,
  readRedirectUri,
  saveRedirectUri,
} from '@/utils/auth'

/**
 * 用户状态（zustand）
 *
 * - 登录态来自后端 SSO 会话（Cookie），前端不保存 token
 * - 用户信息由 BFF /api/bff/me 聚合下发
 * - SSO 登录走 OAuth2 授权码（整页跳转）
 * - 多标签页同步：登录/退出时通过 localStorage 广播，其他标签页自动跟随
 *
 * 组件内用法：
 *   const userInfo = useUserStore((s) => s.userInfo)
 *   const isAdmin = useIsAdmin()
 *   const { logout } = useUserStore.getState()   // 非组件环境
 */

/** 并发去重：路由守卫与布局挂载可能同时触发，避免重复请求 /bff/me */
let fetchPromise = null

export const useUserStore = create((set, get) => ({
  userInfo: null,

  /** 首次登录态探测是否已完成：未完成时布局不渲染「登录 / 用户」按钮，避免首帧闪一下 */
  loginChecked: false,

  /** 清空本地登录态（不发请求、不跳转；跳转由调用方决定） */
  clearUser: () => set({ userInfo: null }),

  /**
   * SSO 登录（OAuth2 客户端，全后端统一规范路径）：
   * 整页跳转到后端 /sso/authorize，后端 302 到授权服务器；
   * 授权后回调 /sso/callback 换 token 建会话，再 302 回前端页面。
   *
   * @param redirectUri 登录成功后的回跳地址（/login?redirect_uri=xxx 传入，缺省 '/'）：
   *   1. 以「站内相对路径」透传给后端（不再拼当前源）：前端与后端同域部署、开发环境走 vite 代理时，
   *      浏览器都按前端当前源解析 302 的 Location，能准确回到前端页面；
   *      后端对相对路径直接放行，不必依赖 CORS 白名单，也就不会退到 SSO_LOGIN_SUCCESS_URL 兜底页；
   *   2. 若调用方明确传了绝对地址（跨域部署场景），后端会按 CORS 允许来源校验 origin；
   *   3. 同时存 localStorage（带 30 分钟过期，见 utils/auth.js），
   *      作为兜底：授权链路没带回跳地址时由登录页 / 布局消费一次。
   */
  loginWithSso: (redirectUri = '') => {
    const target = normalizeRedirectUri(redirectUri)
    saveRedirectUri(target)
    window.location.href = buildAuthorizeUrl(target)
  },

  /** 拉取 SSO 登录态（BFF 聚合接口；未登录返回 401 时静默忽略） */
  fetchLoginUser: async (force = false) => {
    if (!force && get().userInfo) {
      return get().userInfo
    }
    if (fetchPromise) {
      return fetchPromise
    }
    fetchPromise = (async () => {
      let info = null
      try {
        const { data } = await getBffMeApi()
        info = data?.uid || data?.name ? data : null
      } catch {
        info = null
      }
      set({ userInfo: info })
      return info
    })().finally(() => {
      fetchPromise = null
      set({ loginChecked: true })
    })
    return fetchPromise
  },

  /**
   * 单点退出：请求后端 POST /api/auth/logout 销毁服务端会话，
   * 清除本地用户信息与回跳地址，并通知其他标签页同步退出；
   * 接口失败（含 401 会话已过期）不抛出、不弹 toast，仍视为退出成功；
   * 成功时返回后端的 ssoLogoutUrl（配置了 SSO_LOGOUT_URI 时），
   * 由调用方（/logout 页）整页跳转完成 SSO 全局退出。
   */
  logout: async () => {
    let ssoLogoutUrl = ''
    try {
      const { data } = await logoutApi()
      ssoLogoutUrl = data?.ssoLogoutUrl || ''
    } catch {
      // 后端退出失败（如会话已过期 401）不影响本地登出
    } finally {
      set({ userInfo: null })
      clearRedirectUri()
      broadcastAuth('logout')
    }
    return ssoLogoutUrl
  },

  /**
   * 登录态失效（接口层 401 通知）：清空本地状态并广播，避免其他标签页仍显示已登录。
   * 跳转到登录页由路由守卫负责（它才知道当前路由）。
   */
  markLoggedOut: () => {
    const wasLoggedIn = !!get().userInfo
    set({ userInfo: null })
    clearRedirectUri()
    if (wasLoggedIn) {
      broadcastAuth('logout')
    }
  },

  /** 登录成功后广播（布局/登录页确认已登录时调用，其他标签页据此刷新） */
  markLoggedIn: () => {
    if (get().userInfo) {
      broadcastAuth('login')
    }
  },

    // 透传回跳地址读写，页面层不必再关心存储细节
  readRedirectUri,
  clearRedirectUri,
}))

/** 是否已登录 */
export const useIsLoggedIn = () => useUserStore((s) => !!s.userInfo)

/** 首次登录态探测是否已完成（未完成时布局不渲染登录按钮，避免闪烁） */
export const useLoginChecked = () => useUserStore((s) => s.loginChecked)

/** 是否为管理员（由后端按 SSO_ADMIN_UID 判定，通过 BFF /api/bff/me 下发） */
export const useIsAdmin = () => useUserStore((s) => s.userInfo?.isAdmin === true)

/** 展示名：昵称 > 用户名 > name（三者都缺省时由调用方回退） */
export const useDisplayName = () =>
  useUserStore((s) => s.userInfo?.nickname || s.userInfo?.username || s.userInfo?.name || '')

// 订阅其他标签页的登录态变化（store 初始化时注册一次）
if (typeof window !== 'undefined') {
  onAuthBroadcast((type) => {
    if (type === 'logout') {
      useUserStore.setState({ userInfo: null })
    } else if (type === 'login' && !useUserStore.getState().userInfo) {
      useUserStore.getState().fetchLoginUser(true)
    }
  })
}
