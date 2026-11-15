import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

// 路由懒加载：页面各自打成独立 chunk（与 vue 模板的动态 import 等价）
const Login = lazy(() => import('@/views/Login'))
const Logout = lazy(() => import('@/views/Logout'))
const NotFound = lazy(() => import('@/views/NotFound'))
const ImageBed = lazy(() => import('@/views/ImageBed'))
const AdminUsers = lazy(() => import('@/views/admin/AdminUsers'))
const AdminRecycle = lazy(() => import('@/views/admin/AdminRecycle'))

const ConsoleLayout = lazy(() => import('@/layouts/ConsoleLayout'))
const RequireAdmin = lazy(() => import('@/components/RequireAdmin'))

/**
 * 路由表
 *
 * - 已弃用的营销页（/home、/about、/components）统一 redirect 到图床，
 *   保留旧链接不 404
 * - 管理后台走管理员守卫，普通用户无法进入
 * - 兜底 404
 */
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/image-bed" replace /> },

  // 历史营销页 → 统一收敛到图床
  { path: '/home', element: <Navigate to="/image-bed" replace /> },
  { path: '/about', element: <Navigate to="/image-bed" replace /> },
  { path: '/components', element: <Navigate to="/image-bed" replace /> },

  { path: '/login', element: <Login /> },
  { path: '/logout', element: <Logout /> },

  {
    path: '/image-bed',
    element: <ConsoleLayout />,
    children: [{ index: true, element: <ImageBed /> }],
  },

  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <ConsoleLayout />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/users" replace /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'recycle', element: <AdminRecycle /> },
    ],
  },

  { path: '*', element: <NotFound /> },
])
