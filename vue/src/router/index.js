import { createRouter, createWebHistory } from 'vue-router'

import BasicLayout from '@/layouts/BasicLayout.vue'

const APP_TITLE = import.meta.env.VITE_APP_TITLE || ''

const routes = [
  // 登录页（独立全屏，不在 BasicLayout 内）
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' },
  },
  // 退出登录页（独立全屏）：请求后端单点退出后回登录页
  {
    path: '/logout',
    name: 'Logout',
    component: () => import('@/views/Logout.vue'),
    meta: { title: '退出登录' },
  },
  {
    path: '/',
    component: BasicLayout,
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'about',
        name: 'About',
        component: () => import('@/views/About.vue'),
        meta: { title: '关于' },
      },
      {
        path: 'components',
        name: 'Components',
        component: () => import('@/views/Components.vue'),
        meta: { title: '组件预览' },
      },
    ],
  },
  // 404 兜底
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '404' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 全局前置守卫：动态设置页面标题
router.beforeEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} - ${APP_TITLE}` : APP_TITLE
  return true
})

export default router
