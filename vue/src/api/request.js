import axios from 'axios'
import { message } from '@/utils/app'

// 创建 axios 实例
// withCredentials：SSO 登录态是后端会话 Cookie（JSESSIONID / SESSION），
// 浏览器自动携带、前端不保存任何 token；跨域部署时后端需允许 credentials。
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  withCredentials: true,
})

// 响应拦截器：统一解包与错误处理
service.interceptors.response.use(
  (response) => {
    // 若后端返回 { code, data, message } 结构，在此统一处理
    const res = response.data
    if (res && typeof res === 'object' && 'code' in res) {
      if (res.code === 0 || res.code === 200) {
        return res
      }
      // 401：会话已过期，由业务层决定是否跳转登录
      if (!response.config?.skipErrorToast) {
        message.error(res.message || '请求失败')
      }
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return response
  },
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      if (!error.config?.skipErrorToast) {
        message.error('登录已过期，请重新登录')
      }
    } else if (!error.config?.skipErrorToast) {
      message.error(error.response?.data?.message || error.message || '网络异常')
    }
    return Promise.reject(error)
  },
)

export default service
