import axios from 'axios'
import { message } from '@/utils/app'

// 创建 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
})

// 请求拦截器：统一携带 token
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器：统一解包与错误处理
service.interceptors.response.use(
  (response) => {
    // 若后端返回 { code, data, message } 结构，在此统一处理
    const res = response.data
    if (res && typeof res === 'object' && 'code' in res) {
      if (res.code === 0 || res.code === 200) {
        return res
      }
      // 登录过期：清除凭证（不跳转，由业务层自行处理）
      if (res.code === 401) {
        localStorage.removeItem('token')
      }
      message.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return response
  },
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      // 登录过期：清除凭证（不跳转，由业务层自行处理）
      localStorage.removeItem('token')
      message.error('登录已过期，请重新登录')
    } else {
      message.error(error.response?.data?.message || error.message || '网络异常')
    }
    return Promise.reject(error)
  },
)

export default service
