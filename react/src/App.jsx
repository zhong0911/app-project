import { useEffect } from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import { RouterProvider } from 'react-router-dom'

import { AUTH_UNAUTHORIZED_EVENT } from '@/api/request'
import { useLocaleStore } from '@/config/locale'
import { getThemeConfig } from '@/config/theme'
import { router } from '@/router'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'

/**
 * 应用根组件
 *
 * 1. 主题：ConfigProvider 的 theme + <html> 的 dark 类（Tailwind darkMode: 'class'）
 * 2. 语言：ConfigProvider 的 locale（antd 组件文案），业务文案由 i18next 负责
 * 3. 401 全局处理：清本地登录态并跳登录页（等价于 vue 模板 router 里的
 *    AUTH_UNAUTHORIZED_EVENT 监听）
 */
export default function App() {
  const isDark = useAppStore((s) => s.isDark)
  const locale = useLocaleStore((s) => s.locale)

  // 主题落到 <html>：dark 类给 Tailwind / index.css 用，colorScheme 让原生控件跟随
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
    root.style.backgroundColor = isDark ? '#12141b' : '#f0f4fc'
  }, [isDark])

  // 接口返回 401：清空登录态并带当前地址跳登录页（登录后回到原页面）
  useEffect(() => {
    const handler = () => {
      const { pathname, search } = window.location
      useUserStore.getState().markLoggedOut()
      if (pathname !== '/login' && pathname !== '/logout') {
        const redirect = encodeURIComponent(`${pathname}${search}`)
        router.navigate(`/login?redirect_uri=${redirect}`, { replace: true })
      }
    }
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handler)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handler)
  }, [])

  return (
    <ConfigProvider locale={locale.antd} theme={getThemeConfig(isDark)}>
      {/* antd App 提供 message / modal 的 context，同时承载全局样式基线 */}
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  )
}
