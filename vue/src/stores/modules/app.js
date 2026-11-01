import { defineStore } from 'pinia'
import { ref } from 'vue'
import Cookies from 'js-cookie'

const THEME_KEY = 'theme-mode'

/**
 * 应用级通用状态：侧边栏折叠、暗色主题
 * 说明：<html> 的 dark 类由 App.vue 中的 watch 统一同步，这里只维护状态与持久化。
 * 语言由全局配置中心（src/config/locale.js）统一管理，不在此维护。
 */
export const useAppStore = defineStore('app', () => {
  // 侧边栏折叠
  const collapsed = ref(false)

  // 暗色主题：优先读 Cookie，其次 localStorage
  const isDark = ref(
    Cookies.get(THEME_KEY) === 'dark' || localStorage.getItem(THEME_KEY) === 'dark',
  )

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function toggleDark() {
    isDark.value = !isDark.value
    const mode = isDark.value ? 'dark' : 'light'
    localStorage.setItem(THEME_KEY, mode)
    Cookies.set(THEME_KEY, mode, {
      expires: 365,
      path: '/',
      sameSite: 'lax',
    })
  }

  return { collapsed, isDark, toggleCollapsed, toggleDark }
})
