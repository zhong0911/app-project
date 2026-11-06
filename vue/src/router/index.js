import { createRouter, createWebHistory } from 'vue-router'

import ConsoleLayout from '@/layouts/ConsoleLayout.vue'
import LandingLayout from '@/layouts/LandingLayout.vue'
import { APP_TITLE } from '@/config/app'
import { useUserStore } from '@/stores/modules/user'

const routes = [
  // 首页：营销落地页（LandingLayout 自带 header / footer，无侧边菜单）
  {
    path: '/',
    component: LandingLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页' },
      },
    ],
  },
  // 兼容旧链接
  { path: '/home', redirect: '/' },
  // 登录页（独立全屏，不在布局内）
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
  // 示例页面：沿用带侧边菜单的 ConsoleLayout
  {
    path: '/about',
    component: ConsoleLayout,
    children: [
      {
        path: '',
        name: 'About',
        component: () => import('@/views/About.vue'),
        meta: { title: '关于' },
      },
    ],
  },
  {
    path: '/components',
    component: ConsoleLayout,
    children: [
      {
        path: '',
        name: 'Components',
        component: () => import('@/views/Components.vue'),
        meta: { title: '组件预览' },
      },
    ],
  },
  // PaaS 控制台：总览
  {
    path: '/overview',
    component: ConsoleLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Overview',
        component: () => import('@/views/paas/Overview.vue'),
        meta: { title: '控制台总览', requiresAuth: true },
      },
    ],
  },
  // PaaS 控制台：应用列表与应用详情
  {
    path: '/apps',
    component: ConsoleLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Apps',
        component: () => import('@/views/paas/Apps.vue'),
        meta: { title: '应用管理', requiresAuth: true },
      },
      {
        path: ':id',
        name: 'AppDetail',
        component: () => import('@/views/paas/AppDetail.vue'),
        meta: { title: '应用详情', requiresAuth: true },
      },
    ],
  },
  // 管理后台（ConsoleLayout + 左侧菜单，仅管理员）：/admin 默认进入用户管理
  {
    path: '/admin',
    component: ConsoleLayout,
    redirect: '/admin/users',
    meta: { requiresAdmin: true },
    children: [
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/AdminUsers.vue'),
        meta: { title: '用户管理', requiresAdmin: true },
      },
      {
        path: 'recycle',
        name: 'AdminRecycle',
        component: () => import('@/views/admin/AdminRecycle.vue'),
        meta: { title: '回收站', requiresAdmin: true },
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

// 全局前置守卫：动态设置页面标题 + 登录校验 + 管理后台管理员校验
router.beforeEach(async (to) => {
  document.title = to.meta?.title ? `${to.meta.title} - ${APP_TITLE}` : APP_TITLE

  const needAuth = to.matched.some((record) => record.meta?.requiresAuth || record.meta?.requiresAdmin)
  if (!needAuth) {
    return true
  }

  const userStore = useUserStore()
  if (!userStore.isLoggedIn) {
    await userStore.fetchLoginUser()
  }
  if (!userStore.isLoggedIn) {
    return { path: '/login', query: { redirect_uri: to.fullPath } }
  }

  if (!to.meta?.requiresAdmin) {
    return true
  }
  if (!userStore.isAdmin) {
    // 已登录非管理员 -> 回控制台总览
    return { path: '/overview' }
  }
  return true
})

export default router
