import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import PageLoading from '@/components/PageLoading'
import { useUserStore } from '@/stores/user'

/**
 * 管理员路由守卫（对应 vue 模板 router.beforeEach 里的 requiresAdmin 逻辑）
 *
 * 1. 先拉一次 SSO 登录态（/api/bff/me，全局并发去重）；
 * 2. 未登录 → /login?redirect_uri=当前地址（登录后回到原页面）；
 * 3. 已登录但不是管理员 → 回首页（普通用户看不到管理后台入口）。
 *
 * 管理员身份由后端下发（isAdmin），前端不做角色推断。
 */
export default function RequireAdmin({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const userInfo = useUserStore((s) => s.userInfo)
  const fetchLoginUser = useUserStore((s) => s.fetchLoginUser)

  // 首次校验是否已完成（避免 userInfo 为 null 时误判为未登录）
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchLoginUser().then((info) => {
      if (cancelled) return
      if (!info) {
        navigate(`/login?redirect_uri=${encodeURIComponent(location.pathname + location.search)}`, {
          replace: true,
        })
      } else if (info.isAdmin !== true) {
        navigate('/', { replace: true })
      } else {
        setChecked(true)
      }
    })
    return () => {
      cancelled = true
    }
    // 仅在首次进入管理区时校验
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!checked || !userInfo) {
    return <PageLoading height="100vh" />
  }
  if (userInfo.isAdmin !== true) {
    return <PageLoading height="100vh" />
  }
  return children
}
