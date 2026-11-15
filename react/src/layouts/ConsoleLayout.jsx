import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, Outlet } from 'react-router-dom'
import { Button, Drawer, Dropdown, Grid, Layout } from 'antd'
import {
  AppstoreOutlined,
  DeleteOutlined,
  GlobalOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SettingOutlined,
  SunOutlined,
  SafetyOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'

import PageLoading from '@/components/PageLoading'
import { ACCOUNT_CENTER_URL } from '@/config/app'
import { LOCALES, useLocaleStore } from '@/config/locale'
import { useAppStore } from '@/stores/app'
import { useUserStore, useIsLoggedIn, useIsAdmin, useLoginChecked } from '@/stores/user'
import { refreshAppContext } from '@/utils/app'
import { releaseDrawerScrollLock, restoreDrawerScrollLock } from '@/utils/scroll-lock'
import SideMenu from './SideMenu'

const { Sider, Header, Content } = Layout

/**
 * 控制台布局（示例页 / 管理后台复用）
 *
 * - 桌面端：fixed 侧边栏（220px，折叠 80px）+ 顶栏 + 内容区
 * - 移动端（<768px）：侧边栏收进 Drawer，顶栏左侧按钮打开
 * - 顶栏右侧：语言切换 / 主题切换 / 用户菜单（未登录显示登录入口）
 */
export default function ConsoleLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  // 响应式断点：md 以下视为移动端；首帧 screens.md 为 undefined，按桌面渲染
  const screens = Grid.useBreakpoint()
  const isMobile = screens.md === false

  const collapsed = useAppStore((s) => s.collapsed)
  const toggleCollapsed = useAppStore((s) => s.toggleCollapsed)
  const isDark = useAppStore((s) => s.isDark)
  const toggleDark = useAppStore((s) => s.toggleDark)

  const localeKey = useLocaleStore((s) => s.key)
  const setLocale = useLocaleStore((s) => s.setLocale)

  const isLoggedIn = useIsLoggedIn()
  const isAdmin = useIsAdmin()
  // 首次登录态探测完成前不渲染登录按钮，避免首帧闪一下「登录」
  const loginChecked = useLoginChecked()

  const [drawerOpen, setDrawerOpen] = useState(false)

  // 抽屉开合时同步 body 滚动锁：antd 关闭后锁可能残留，会让页面滚不动
  useEffect(() => {
    if (drawerOpen) {
      restoreDrawerScrollLock()
      return undefined
    }
    const timer = setTimeout(releaseDrawerScrollLock, 0)
    return () => clearTimeout(timer)
  }, [drawerOpen])

  // 进入应用时拉取 SSO 登录态（会话 Cookie 由后端维护；未登录静默忽略）
  // 若存在 /login?redirect_uri 暂存的回跳地址且已登录，登录后跳转该地址
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await useUserStore.getState().fetchLoginUser()
      if (cancelled) return
      const redirect = useUserStore.getState().readRedirectUri()
      const userInfo = useUserStore.getState().userInfo
      if (redirect && userInfo) {
        useUserStore.getState().clearRedirectUri()
        useUserStore.getState().markLoggedIn()
        if (/^https?:\/\//i.test(redirect)) {
          window.location.replace(redirect)
        } else {
          navigate(redirect, { replace: true })
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // 仅在进入布局时处理一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 菜单数据：管理后台（/admin）显示后台 tabs；业务区放首页 / 示例页
  const isAdminArea = location.pathname.startsWith('/admin')
  const menuItems = isAdminArea
    ? [
        { key: '/admin/users', label: t('nav.adminUsers'), icon: <TeamOutlined /> },
        { key: '/admin/roles', label: t('nav.adminRoles'), icon: <SafetyOutlined /> },
        { key: '/admin/recycle', label: t('nav.adminRecycle'), icon: <DeleteOutlined /> },
      ]
    : [
        // 首页走落地页布局（LandingLayout），这里作为回首页的入口
        { key: '/', label: t('nav.home'), icon: <HomeOutlined /> },
        { key: '/about', label: t('nav.about'), icon: <InfoCircleOutlined /> },
        { key: '/components', label: t('nav.components'), icon: <AppstoreOutlined /> },
        // 管理员身份由后端下发，非管理员看不到后台入口
        ...(isAdmin
          ? [{ key: '/admin/users', label: t('common.adminPanel'), icon: <SettingOutlined /> }]
          : []),
      ]

  const selectedKeys = [location.pathname]
  // 当前页面对应的菜单标题（显示在顶栏左侧）
  const currentMenuTitle = menuItems.find((m) => m.key === location.pathname)?.label || ''

  const handleMenuClick = ({ key }) => {
    navigate(key)
    // 移动端：选中后关闭抽屉
    if (isMobile) {
      setDrawerOpen(false)
    }
  }

  // 退出登录：进入 /logout 页，由该页请求后端单点退出并跳转
  const handleLogout = () => navigate('/logout')

  // 登录后用户菜单：管理员多一个「管理后台」入口；账号中心（跳 SSO 账号中心）+ 退出登录
  const userMenuItems = [
    ...(isAdmin
      ? [{ key: 'admin', label: t('common.adminPanel'), icon: <SettingOutlined /> }]
      : []),
    { key: 'account', label: t('common.accountCenter'), icon: <UserOutlined /> },
    { key: 'logout', label: t('common.logout'), icon: <LogoutOutlined /> },
  ]

  const handleUserMenu = ({ key }) => {
    if (key === 'admin') {
      // 后台入口（仅管理员可见）：/admin 默认重定向到用户管理
      navigate('/admin')
      return
    }
    if (key === 'account') {
      // 账号中心在 SSO（passport.antx.cc）侧，新标签打开，避免把当前页面带离前端
      window.open(ACCOUNT_CENTER_URL, '_blank', 'noopener')
      return
    }
    handleLogout()
  }

  const sideMenuProps = {
    theme: isDark ? 'dark' : 'light',
    menus: menuItems,
    selectedKeys,
    onMenuClick: handleMenuClick,
  }

  return (
    <Layout className="layout-root">
      {/* 桌面端侧边栏：固定不随页面滚动；宽度随折叠状态变化；theme 跟随全局主题 */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={toggleCollapsed}
          collapsedWidth={80}
          width={220}
          trigger={null}
          theme={isDark ? 'dark' : 'light'}
          className="layout-sider"
        >
          <SideMenu {...sideMenuProps} collapsed={collapsed} />
        </Sider>
      )}

      {/* 移动端菜单抽屉 */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          placement="left"
          width={220}
          closable={false}
          styles={{ body: { padding: 0 } }}
          onClose={() => setDrawerOpen(false)}
        >
          <SideMenu {...sideMenuProps} onLogoClick={() => setDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout className="layout-main" style={{ marginLeft: isMobile ? 0 : collapsed ? 80 : 220 }}>
        {/* 顶栏 */}
        <Header className="header">
          <div className="header-left">
            {/* 移动端：菜单按钮打开抽屉；桌面端：折叠/展开 */}
            {isMobile ? (
              <MenuOutlined className="trigger" onClick={() => setDrawerOpen(true)} />
            ) : collapsed ? (
              <MenuUnfoldOutlined className="trigger" onClick={toggleCollapsed} />
            ) : (
              <MenuFoldOutlined className="trigger" onClick={toggleCollapsed} />
            )}
            {/* 当前页面标题（对应左侧菜单） */}
            {currentMenuTitle && <span className="page-title">{currentMenuTitle}</span>}
          </div>

          <div className="header-right">
            {/* 语言切换：与主题按钮同款的圆形图标按钮，不显示当前语言文字 */}
            <Dropdown
              trigger={['click']}
              menu={{
                items: LOCALES.map((l) => ({ key: l.key, label: l.label })),
                selectable: true,
                selectedKeys: [localeKey],
                onClick: ({ key }) => {
                  setLocale(key)
                  refreshAppContext()
                },
              }}
            >
              <Button size="small" type="text" shape="circle" className="lang-btn" icon={<GlobalOutlined />} />
            </Dropdown>

            {/* 主题切换：暗色显示太阳，亮色显示月亮 */}
            <Button
              size="small"
              type="text"
              shape="circle"
              className="theme-btn"
              icon={isDark ? <SunOutlined /> : <MoonOutlined />}
              onClick={() => {
                toggleDark()
                refreshAppContext()
              }}
            />

            {/* 用户菜单：未登录显示登录入口（跳转 /login 页）；
                登录态探测完成前只留等宽占位，避免先闪一下登录按钮 */}
            {!loginChecked ? (
              <span className="auth-slot" aria-hidden="true" />
            ) : !isLoggedIn ? (
              <Button size="small" type="primary" onClick={() => navigate('/login')}>
                {t('common.login')}
              </Button>
            ) : (
              <Dropdown trigger={['click']} menu={{ items: userMenuItems, onClick: handleUserMenu }}>
                <Button size="small" type="text" shape="circle" className="user-btn" icon={<UserOutlined />} />
              </Dropdown>
            )}
          </div>
        </Header>

        {/* 内容区：懒加载页面 chunk 时居中显示 loading */}
        <Content className="content">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  )
}
