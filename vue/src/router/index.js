import { createRouter, createWebHistory } from 'vue-router'

import ConsoleLayout from '@/layouts/ConsoleLayout.vue'
import SimpleLayout from '@/layouts/SimpleLayout.vue'
import { APP_TITLE } from '@/config/app'
import { AUTH_UNAUTHORIZED_EVENT } from '@/api/request'
import { useUserStore } from '@/stores/modules/user'

const routes = [
  // 站点首页就是图床（ConsoleLayout + 左侧菜单），不再经过模板营销页
  { path: '/', redirect: '/image-bed' },
  // 兼容旧链接（模板时期首页、示例页）
  { path: '/home', redirect: '/image-bed' },
  { path: '/about', redirect: '/image-bed' },
  { path: '/components', redirect: '/image-bed' },
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
  // 图床（极简布局：无侧边菜单，右上角仅管理员可见控制台入口）
  {
    path: '/image-bed',
    component: SimpleLayout,
    children: [
      {
        path: '',
        name: 'ImageBed',
        component: () => import('@/views/image/ImageBed.vue'),
        meta: { title: '图床' },
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

// 全局前置守卫：动态设置页面标题 + 管理后台管理员校验
router.beforeEach(async (to) => {
  document.title = to.meta?.title ? `${to.meta.title} - ${APP_TITLE}` : APP_TITLE
  if (!to.meta?.requiresAdmin) {
    return true
  }
  const userStore = useUserStore()
  if (!userStore.isLoggedIn) {
    await userStore.fetchLoginUser()
  }
  if (!userStore.isAdmin) {
    // 未登录 -> 走 SSO 登录并回跳；已登录非管理员 -> 回首页
    return userStore.isLoggedIn
      ? { path: '/' }
      : { path: '/login', query: { redirect_uri: to.fullPath } }
  }
  return true
})

/**
 * 接口层 401 统一处理：清空登录态 → 跳登录页并带上当前地址作为回跳参数。
 * 登录页/退出页自身不再跳转，避免循环。
 * （探测型接口如 /bff/me 已置 skipAuthRedirect，不会触发这里）
 */
window.addEventListener(AUTH_UNAUTHORIZED_EVENT, () => {
  const userStore = useUserStore()
  userStore.markLoggedOut()

  const current = router.currentRoute.value
  if (current.name === 'Login' || current.name === 'Logout') {
    return
  }
  router.replace({ path: '/login', query: { redirect_uri: current.fullPath } })
})

export default router
