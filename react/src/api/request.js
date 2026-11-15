import axios from 'axios'
import { message } from '@/utils/app'

/**
 * 业务成功码（后端 Spring Boot 的 ResultCode.SUCCESS；其余语言模板保持一致）
 * 注意：不同模板可能返回 200 或 0，两者都算成功，避免前端按语言改。
 */
const SUCCESS_CODES = [200, 0]

/** 按 HTTP 状态码给出可行动的提示（不再统一「请求失败」） */
const STATUS_MESSAGE = {
  400: '请求参数有误，请检查后重试',
  403: '无访问权限',
  404: '请求的资源不存在',
  405: '请求方法不被支持',
  409: '数据冲突，请刷新后重试',
  429: '操作过于频繁，请稍后再试',
  500: '服务器开小差了，请稍后重试',
  502: '服务暂时不可用，请稍后重试',
  503: '服务暂时不可用，请稍后重试',
  504: '服务响应超时，请稍后重试',
}

// 登录态失效事件：由 router 监听，统一清状态并跳登录页
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized'

// 创建 axios 实例
// withCredentials：SSO 登录态是后端会话 Cookie（JSESSIONID / SESSION），
// 浏览器自动携带、前端不保存任何 token；跨域部署时后端需允许 credentials。
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  withCredentials: true,
})

/**
 * 请求取消管理（key -> AbortController）
 * 用法：request.get(url, { key: 'admin-users' }) —— 同 key 的新请求取消上一个，
 * 常用于列表翻页/搜索联动，避免旧响应覆盖新数据。
 */
const pendingControllers = new Map()

export function cancelRequest(key) {
  const controller = pendingControllers.get(key)
  if (controller) {
    controller.abort()
    pendingControllers.delete(key)
  }
}

export function cancelAllRequests() {
  pendingControllers.forEach((controller) => controller.abort())
  pendingControllers.clear()
}

service.interceptors.request.use(
  (config) => {
    if (config.key) {
      cancelRequest(config.key)
      const controller = new AbortController()
      pendingControllers.set(config.key, controller)
      config.signal = controller.signal
      // 请求结束后清理，避免 Map 泄漏
      config.onCancel = () => pendingControllers.delete(config.key)
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器：统一解包与错误处理
service.interceptors.response.use(
  (response) => {
    const config = response.config || {}
    if (config.onCancel) {
      config.onCancel()
    }

    // 若后端返回 { code, data, message } 结构，在此统一处理
    const res = response.data
    if (res && typeof res === 'object' && 'code' in res) {
      if (SUCCESS_CODES.includes(res.code)) {
        return res
      }
      // 401：会话过期，交给 router 统一处理（探测型接口置 skipAuthRedirect 不跳转）
      if (res.code === 401 && !config.skipAuthRedirect) {
        window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT, { detail: res.message }))
      }
      if (!config.skipErrorToast) {
        message.error(res.message || '请求失败')
      }
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return response
  },
  (error) => {
    const config = error.config || {}
    if (config.onCancel) {
      config.onCancel()
    }

    // 主动取消的请求：静默失败，不提示
    if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
      return Promise.reject(error)
    }

    const status = error.response?.status
    const serverMessage = error.response?.data?.message
    let text = ''

    if (status === 401) {
      if (!config.skipAuthRedirect) {
        window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT, { detail: serverMessage }))
      }
      text = '登录已过期，请重新登录'
    } else if (status) {
      // 后端给了业务文案就优先用它，否则用状态码兜底文案
      text = serverMessage || STATUS_MESSAGE[status] || `请求失败（HTTP ${status}）`
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      text = '请求超时，请检查网络后重试'
    } else if (error.message === 'Network Error') {
      text = '网络连接异常，请检查网络'
    } else {
      text = error.message || '请求失败'
    }

    if (!config.skipErrorToast) {
      message.error(text)
    }
    return Promise.reject(error)
  },
)

export default service
