import { create } from 'zustand'
import Cookies from 'js-cookie'

const THEME_KEY = 'theme-mode'

/**
 * 应用级通用状态：侧边栏折叠、暗色主题
 *
 * - <html> 的 dark 类由 App.jsx 中的 effect 统一同步，这里只维护状态与持久化
 * - 语言由全局配置中心（src/config/locale.js）统一管理，不在此维护
 */
export const useAppStore = create((set, get) => ({
  // 侧边栏折叠
  collapsed: false,

  // 暗色主题：优先读 Cookie，其次 localStorage
  isDark: Cookies.get(THEME_KEY) === 'dark' || localStorage.getItem(THEME_KEY) === 'dark',

  toggleCollapsed: () => set({ collapsed: !get().collapsed }),

  /** 切换亮/暗：写 localStorage + Cookie(365 天)，供首屏脚本与刷新后恢复 */
  toggleDark: () => {
    const isDark = !get().isDark
    const mode = isDark ? 'dark' : 'light'
    localStorage.setItem(THEME_KEY, mode)
    Cookies.set(THEME_KEY, mode, { expires: 365, path: '/', sameSite: 'lax' })
    set({ isDark })
  },
}))
