import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'

// antd 5 样式重置（必须在业务样式之前引入）
import 'antd/dist/reset.css'
// Tailwind + 全局设计令牌 + 滚动条样式
import '@/assets/styles/index.css'
// 布局与页面结构样式
import '@/assets/styles/components.css'
// 落地页（首页 / LandingLayout）样式
import '@/assets/styles/landing.css'

import App from './App'
import PageLoading from '@/components/PageLoading'
import { useUserStore } from '@/stores/user'
import { setupAppContext } from '@/utils/app'

// 静态弹层（message / modal）继承全局语言与主题
setupAppContext()

/**
 * 挂载前先探测一次登录态（路由守卫 / 布局挂载会复用同一个请求，不会重复发）。
 * 这样首帧就能直接渲染「登录」或「用户」按钮，顶栏右侧不再有等宽占位的空白期；
 * 最多等 1.5s，后端无响应时照常挂载，由布局的占位兜底。
 */
const prefetchAuth = () =>
  Promise.race([
    useUserStore.getState().fetchLoginUser(),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ])

prefetchAuth().finally(() => {
  createRoot(document.getElementById('root')).render(
    // 路由懒加载的顶层兜底：页面 chunk 加载中时居中显示 loading
    <Suspense fallback={<PageLoading />}>
      <App />
    </Suspense>,
  )
})
