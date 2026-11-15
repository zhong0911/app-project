import { createApp } from 'vue'
import { createPinia } from 'pinia'

import 'antdv-next/dist/reset.css'

import App from './App.vue'
import router from './router'
import { i18n } from './locales'

import './assets/styles/index.css'

import { setupAppContext } from '@/utils/app'
import { useUserStore } from '@/stores/modules/user'

const app = createApp(App)

// 状态管理
app.use(createPinia())

// 路由
app.use(router)

// 国际化（文案；antdv-next 语言包由 config/locale.js 同步）
app.use(i18n)

// AntdvNext 按需引入：由 vite.config.js 的 unplugin-vue-components（AntdvNextResolver）
// 在页面模板中自动 import 所用组件，无需全局注册

// 初始化全局静态弹层 context
setupAppContext()

/**
 * 挂载前先探测一次登录态（路由守卫 / 布局挂载会复用同一个请求，不会重复发）。
 * 这样首帧就能直接渲染「登录」或「用户」按钮，顶栏右侧不再有等宽占位的空白期；
 * 最多等 1.5s，后端无响应时照常挂载，由布局的占位兜底。
 */
const prefetchAuth = () =>
  Promise.race([
    useUserStore().fetchLoginUser(),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ])

prefetchAuth().finally(() => app.mount('#app'))
