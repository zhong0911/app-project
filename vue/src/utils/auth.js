/**
 * 登录链路公共工具
 *
 * 1. 回跳地址持久化：SSO 是整页跳转，地址必须跨页面/跨标签页存活，
 *    所以从 sessionStorage 换成带过期时间的 localStorage（默认 30 分钟，
 *    避免历史回跳地址长期残留导致下次登录跳到旧页面）。
 * 2. 登录态跨标签页广播：任一标签页登录/退出，其他标签页通过 storage 事件同步，
 *    否则会出现「一个页面已退出、另一个页面还显示已登录」。
 */
const REDIRECT_KEY = 'sso_redirect_uri'
const REDIRECT_TTL = 30 * 60 * 1000
const AUTH_EVENT_KEY = 'antx_auth_event'
const AUTH_EVENT_TTL = 5 * 1000

/** 安全 JSON 解析（脏数据不抛异常） */
const safeParse = (raw) => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** 保存登录成功后要回跳的地址 */
export const saveRedirectUri = (uri) => {
  if (!uri) {
    clearRedirectUri()
    return
  }
  try {
    localStorage.setItem(REDIRECT_KEY, JSON.stringify({ value: uri, expire: Date.now() + REDIRECT_TTL }))
  } catch {
    // 隐私模式/配额超限时静默降级：回跳失效但登录不受影响
  }
}

/**
 * 读取回跳地址：过期或非法返回空串；同时兼容旧版本写在 sessionStorage 的值
 * （升级后用户已有的登录流程不中断），读到旧值即迁移到 localStorage。
 */
export const readRedirectUri = () => {
  let payload = null
  try {
    payload = safeParse(localStorage.getItem(REDIRECT_KEY) || '')
  } catch {
    payload = null
  }

  if (payload?.value) {
    if (typeof payload.expire === 'number' && payload.expire < Date.now()) {
      clearRedirectUri()
      return ''
    }
    return payload.value
  }

  // 兼容旧 key（sessionStorage 版）
  try {
    const legacy = sessionStorage.getItem(REDIRECT_KEY)
    if (legacy) {
      sessionStorage.removeItem(REDIRECT_KEY)
      saveRedirectUri(legacy)
      return legacy
    }
  } catch {
    // 忽略
  }
  return ''
}

/** 清除回跳地址（消费一次即清，避免重复跳转） */
export const clearRedirectUri = () => {
  try {
    localStorage.removeItem(REDIRECT_KEY)
  } catch {
    // 忽略
  }
  try {
    sessionStorage.removeItem(REDIRECT_KEY)
  } catch {
    // 忽略
  }
}

/**
 * 规整回跳地址：只放行「站内相对路径」与 http(s) 绝对地址，
 * 空值、`//evil.com`、`/\evil.com`、`javascript:` 等一律退回首页。
 * 相对路径交给后端直接放行，浏览器再按前端当前源解析，前后端同域与代理场景都安全。
 */
export const normalizeRedirectUri = (uri) => {
  const raw = String(uri || '').trim()
  if (!raw || raw.startsWith('//') || raw.startsWith('/\\')) {
    return '/'
  }
  if (raw.startsWith('/') || /^https?:\/\//i.test(raw)) {
    return raw
  }
  return '/'
}

/**
 * 构造后端 SSO 授权入口：用 URLSearchParams 统一编码，
 * 不再手写字符串拼接，含 query / hash / 中文的地址不会被二次编码或截断。
 */
export const buildAuthorizeUrl = (redirectUri) => {
  const query = new URLSearchParams({ redirect_uri: normalizeRedirectUri(redirectUri) })
  return `/sso/authorize?${query.toString()}`
}

/**
 * 广播登录态变化（'login' / 'logout'）
 * 利用 localStorage 写入触发其他标签页的 storage 事件；带时间戳避免同值写入不触发。
 */
export const broadcastAuth = (type) => {
  try {
    localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify({ type, at: Date.now() }))
    // 广播键无需长期保留
    setTimeout(() => {
      try {
        localStorage.removeItem(AUTH_EVENT_KEY)
      } catch {
        // 忽略
      }
    }, AUTH_EVENT_TTL)
  } catch {
    // 忽略：单标签页场景无影响
  }
}

/**
 * 订阅其他标签页的登录态变化
 * @returns 取消订阅函数
 */
export const onAuthBroadcast = (handler) => {
  const listener = (event) => {
    if (event.key !== AUTH_EVENT_KEY || !event.newValue) {
      return
    }
    const payload = safeParse(event.newValue)
    if (payload?.type === 'login' || payload?.type === 'logout') {
      handler(payload.type)
    }
  }
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}
