import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, Typography } from 'antd'
import { LoginOutlined } from '@ant-design/icons'

import AppIcon from '@/components/AppIcon'
import { APP_TITLE } from '@/config/app'
import { useUserStore } from '@/stores/user'
import { usePageTitle } from '@/utils/useTitle'

/**
 * 登录页（独立布局）
 *
 * - 标题取 VITE_APP_TITLE
 * - 支持 ?redirect_uri=/xxx：SSO 登录成功后回跳该地址
 * - 暗色适配：页面底色用全局渐变（html::before），文字色用全局 CSS 变量，
 *   卡片/按钮由 ConfigProvider 主题算法自动切换
 * - 已登录用户访问本页时直接回跳，避免重复走 SSO 授权
 */
export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  usePageTitle(t('common.login'))

  const fetchLoginUser = useUserStore((s) => s.fetchLoginUser)
  const loginWithSso = useUserStore((s) => s.loginWithSso)

  // ?redirect_uri=xxx（由 router 的 401 处理或管理员守卫带上）
  const redirectParam = new URLSearchParams(location.search).get('redirect_uri') || ''

  useEffect(() => {
    let cancelled = false
    fetchLoginUser().then((info) => {
      if (cancelled || !info) return
      const store = useUserStore.getState()
      // 优先用页面参数，其次用登录前暂存的回跳地址（消费后清除）
      const target = redirectParam || store.readRedirectUri() || '/'
      store.clearRedirectUri()
      store.markLoggedIn()
      if (/^https?:\/\//i.test(target)) {
        window.location.replace(target)
      } else {
        navigate(target, { replace: true })
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSsoLogin = () => {
    // 回跳优先级：页面参数 > 登录前暂存的地址 > 首页；
    // 后端拿到后会在 SSO 回调成功时直接跳过去
    loginWithSso(redirectParam || useUserStore.getState().readRedirectUri() || '/')
  }

  return (
    <div className="login-page">
      <Card className="login-card" variant="borderless">
        {/* 应用图标：统一使用 AppIcon（与 favicon、布局 logo 一致）；点击返回首页 */}
        <Link to="/" className="login-home" aria-label={t('nav.home')}>
          <AppIcon size={56} className="login-icon" />
        </Link>

        <Typography.Title level={3} className="login-title">
          {APP_TITLE}
        </Typography.Title>

        <Typography.Paragraph className="login-subtitle">
          {t('login.subtitle')}
        </Typography.Paragraph>

        {/* SSO 登录（整页跳转后端 /sso/authorize；带 redirect_uri 时登录后回跳） */}
        <Button type="primary" size="large" block icon={<LoginOutlined />} onClick={handleSsoLogin}>
          {t('login.ssoButton')}
        </Button>

        <p className="login-hint">{t('login.hint')}</p>
      </Card>
    </div>
  )
}
