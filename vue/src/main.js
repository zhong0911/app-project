import { createApp } from 'vue'
import { createPinia } from 'pinia'

import 'antdv-next/dist/reset.css'

import App from './App.vue'
import router from './router'
import { i18n } from './locales'

import './assets/styles/index.css'

import { setupAppContext } from '@/utils/app'

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

app.mount('#app')
