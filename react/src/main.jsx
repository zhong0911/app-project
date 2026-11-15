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
import { setupAppContext } from '@/utils/app'

// 静态弹层（message / modal）继承全局语言与主题
setupAppContext()

createRoot(document.getElementById('root')).render(
  // 路由懒加载的顶层兜底：页面 chunk 加载中时居中显示 loading
  <Suspense fallback={<PageLoading />}>
    <App />
  </Suspense>,
)
