import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Result, Spin } from 'antd'

import { useUserStore } from '@/stores/user'
import { usePageTitle } from '@/utils/useTitle'

/**
 * 退出登录页（独立于 ConsoleLayout）
 *
 * 进入不自动请求，点击「退出登录」后才请求后端单点退出接口 POST /api/auth/logout；
 * 请求期间显示 loading；结束后展示成功结果 + 「首页 / 登录」两个按钮；
 * 若后端返回 ssoLogoutUrl（配置了 SSO_LOGOUT_URI）则直接整页跳转授权服务器完成全局退出。
 */
export default function Logout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useUserStore((s) => s.logout)

  usePageTitle(t('common.logout'))

  // confirm 待确认 / loading 请求后端中 / done 已退出
  // loading 期间仍保留 confirm 内容（Spin 半透明遮罩），避免卡片高度跳动
  const [state, setState] = useState('confirm')

  const handleLogout = async () => {
    setState('loading')
    try {
      const ssoLogoutUrl = await logout()
      if (ssoLogoutUrl) {
        // SSO 全局退出：整页跳转授权服务器登出端点
        window.location.replace(ssoLogoutUrl)
        return
      }
    } catch {
      // 后端退出失败（如会话已过期）不影响本地登出
    }
    setState('done')
  }

  return (
    <div className="logout-page">
      <Card className="logout-card" variant="borderless">
        <Spin spinning={state === 'loading'} size="large" tip={t('logout.loading')}>
          <div className="logout-body">
            {/* 待确认 + 请求中：点击后才请求退出 */}
            {state !== 'done' && (
              <Result
                title={t('common.logout')}
                subTitle={<p className="logout-sub">{t('logout.confirm')}</p>}
                extra={[
                  <Button key="cancel" onClick={() => navigate(-1)}>
                    {t('logout.cancel')}
                  </Button>,
                  <Button key="ok" type="primary" danger onClick={handleLogout}>
                    {t('common.logout')}
                  </Button>,
                ]}
              />
            )}

            {/* 已退出：返回首页 / 重新登录 */}
            {state === 'done' && (
              <Result
                status="success"
                title={t('logout.successTitle')}
                subTitle={t('logout.successDesc')}
                extra={[
                  <Button key="home" onClick={() => navigate('/', { replace: true })}>
                    {t('logout.home')}
                  </Button>,
                  <Button key="relogin" type="primary" onClick={() => navigate('/login', { replace: true })}>
                    {t('logout.relogin')}
                  </Button>,
                ]}
              />
            )}
          </div>
        </Spin>
      </Card>
    </div>
  )
}
