import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginApi, getUserInfoApi, logoutApi } from '@/api/user'

/**
 * 用户状态示例
 * - 集中管理 token、用户信息
 * - 演示 async action 与 getter 的写法
 */
export const useUserStore = defineStore('user', () => {
  // state
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)

  // getters
  const isLoggedIn = computed(() => !!token.value)
  const displayName = computed(() => userInfo.value?.nickname || userInfo.value?.username || '')

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

  async function logout() {
    try {
      await logoutApi()
    } finally {
      token.value = ''
      userInfo.value = null
      localStorage.removeItem('token')
    }
  }

  return { token, userInfo, isLoggedIn, displayName, login, fetchUserInfo, logout }
})
