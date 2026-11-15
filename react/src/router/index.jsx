import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

// 路由懒加载：页面各自打成独立 chunk（与 vue 模板的动态 import 等价）
const LandingLayout = lazy(() => import('@/layouts/LandingLayout'))
const ConsoleLayout = lazy(() => import('@/layouts/ConsoleLayout'))
const RequireAdmin = lazy(() => import('@/components/RequireAdmin'))

const Home = lazy(() => import('@/views/Home'))
const About = lazy(() => import('@/views/About'))
const Components = lazy(() => import('@/views/Components'))
const ImageBed = lazy(() => import('@/views/ImageBed'))
const Login = lazy(() => import('@/views/Login'))
const Logout = lazy(() => import('@/views/Logout'))
const NotFound = lazy(() => import('@/views/NotFound'))
const AdminUsers = lazy(() => import('@/views/admin/AdminUsers'))
const AdminRecycle = lazy(() => import('@/views/admin/AdminRecycle'))

/**
 * 路由表
 *
 * - `/`：落地页（LandingLayout + Home），模板的门面，无侧边菜单
 * - `/about`、`/components`：示例页，走控制台布局（ConsoleLayout + 侧边菜单）
 * - `/image-bed`：图床示例模块（模板内置的完整业务闭环，可整块删除）
 * - `/admin/*`：管理后台，管理员守卫包 ConsoleLayout
 * - 兜底 404
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingLayout />,
    children: [{ index: true, element: <Home /> }],
  },

  // 兼容旧链接：历史首页地址
  { path: '/home', element: <Navigate to="/" replace /> },

  {
    path: '/about',
    element: <ConsoleLayout />,
    children: [{ index: true, element: <About /> }],
  },

  {
    path: '/components',
    element: <ConsoleLayout />,
    children: [{ index: true, element: <Components /> }],
  },

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
