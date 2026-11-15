import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Button, Drawer, Dropdown, Grid } from 'antd'
import {
  DashboardOutlined,
  GlobalOutlined,
  LoginOutlined,
  LogoutOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons'

import AppIcon from '@/components/AppIcon'
import PageLoading from '@/components/PageLoading'
import { ACCOUNT_CENTER_URL, APP_TITLE } from '@/config/app'
import { LOCALES, useLocaleStore } from '@/config/locale'
import { useAppStore } from '@/stores/app'
import { useIsAdmin, useIsLoggedIn, useLoginChecked, useUserStore } from '@/stores/user'
import { refreshAppContext } from '@/utils/app'
import { releaseDrawerScrollLock, restoreDrawerScrollLock } from '@/utils/scroll-lock'
import SideMenu from './SideMenu'

// 首页锚点导航项（区块 id 与 Home.jsx 中的 section id 对应）
const ANCHORS = [
  { hash: '#intro', labelKey: 'nav.intro' },
  { hash: '#stack', labelKey: 'nav.stack' },
  { hash: '#usage', labelKey: 'nav.usage' },
  { hash: '#structure', labelKey: 'nav.structure' },
]

/**
 * 落地页布局：顶部 header + 内容插槽 + 页脚，无侧边菜单
 *
 * 用于首页这类对外展示页面；后台 / 示例页面使用 ConsoleLayout。
 * 移动端（<768px）导航收进左侧 Drawer，点品牌区即打开。
 */
export default function LandingLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const screens = Grid.useBreakpoint()
  const isMobile = screens.md === false

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

  // 进入应用时拉取 SSO 登录态；从授权页回来时恢复暂存的回跳地址
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

  /**
   * 滚动到区块：顶栏吸顶高 64px，scrollIntoView 会把标题顶到栏后面，
   * 所以按元素位置手算偏移；Home 是懒加载组件，元素可能稍后挂载，用 rAF 逐帧重试。
   */
  const scrollToSection = (hash, smooth = true, frames = 60) => {
    const el = document.querySelector(hash)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 64
      window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
      if (smooth) {
        setTimeout(() => {
          if (Math.abs(window.scrollY - top) > 2) {
            window.scrollTo({ top })
          }
        }, 400)
      }
      return
    }
    if (frames > 0) {
      requestAnimationFrame(() => scrollToSection(hash, smooth, frames - 1))
    }
  }

  // 抽屉里的导航项：锚点回首页对应区块，组件预览走路由
  const drawerItems = [
    ...ANCHORS.map((item) => ({ key: `/${item.hash}`, label: t(item.labelKey) })),
    { key: '/components', label: t('nav.components') },
  ]

  const handleDrawerMenu = ({ key }) => {
    setDrawerOpen(false)
    if (key.startsWith('/#')) {
      const hash = key.slice(1)
      if (location.pathname !== '/') {
        navigate('/')
      }
      // 抽屉关闭会锁 body 滚动，先解除再滚，否则平滑动画会被打断
      setTimeout(() => {
        releaseDrawerScrollLock()
        scrollToSection(hash)
      }, 0)
      return
    }
    navigate(key)
  }

  // 抽屉里的 logo 点击：关闭抽屉并回首页；已停在首页时手动回到顶部
  const handleLogoClick = () => {
    setDrawerOpen(false)
    if (location.pathname === '/') {
      window.scrollTo({ top: 0 })
    }
  }

  // 移动端：点品牌区打开导航抽屉（阻止默认的「回首页」跳转）
  const handleBrandClick = (event) => {
    if (!isMobile) return
    event.preventDefault()
    setDrawerOpen(true)
  }

  const userMenuItems = [
    // 管理员才看到后台入口（isAdmin 由后端按本地角色判定，经 BFF 下发）
    ...(isAdmin
      ? [{ key: 'admin', label: t('common.adminPanel'), icon: <DashboardOutlined /> }]
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
      // 账号中心在 SSO（passport.antx.cc）侧，新标签打开
      window.open(ACCOUNT_CENTER_URL, '_blank', 'noopener')
      return
    }
    navigate('/logout')
  }

  const goLogin = () => {
    // 首页且无锚点时不需要回跳参数，避免出现 ?redirect_uri=/ 这种无意义参数
    if (location.pathname === '/' && !location.hash) {
      navigate('/login')
      return
    }
    navigate(`/login?redirect_uri=${encodeURIComponent(location.pathname + location.search + location.hash)}`)
  }

  return (
    <div className="landing-layout">
      {/* 顶部 header：品牌 + 导航 + 语言 / 主题 / 登录 */}
      <header className="site-header">
        <div className="header-inner">
          {/* 品牌区：桌面端点击回首页；移动端点图标/标题打开抽屉 */}
          <Link
            to="/"
            className={`brand${isMobile ? ' brand-trigger' : ''}`}
            aria-label={isMobile ? t('common.menu') : undefined}
            onClick={(event) => {
              handleBrandClick(event)
              if (!isMobile && location.pathname === '/') {
                window.scrollTo({ top: 0 })
              }
            }}
          >
            <AppIcon size={36} />
            <span className="brand-text">
              <strong>{APP_TITLE}</strong>
              <small>{t('landing.brandSubtitle')}</small>
            </span>
          </Link>

          {/* 桌面导航：锚点走平滑滚动，组件预览走路由 */}
          <nav className="site-nav">
            {ANCHORS.map((item) => (
              <a key={item.hash} href={item.hash} onClick={(event) => {
                event.preventDefault()
                scrollToSection(item.hash)
              }}>
                {t(item.labelKey)}
              </a>
            ))}
            <Link to="/components">{t('nav.components')}</Link>
          </nav>

          <div className="header-actions">
            {/* 语言切换 */}
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
              <Button type="text" shape="circle" className="icon-btn" icon={<GlobalOutlined />} />
            </Dropdown>

            {/* 主题切换：暗色显示太阳，亮色显示月亮 */}
            <Button
              type="text"
              shape="circle"
              className="icon-btn"
              icon={isDark ? <SunOutlined /> : <MoonOutlined />}
              onClick={() => {
                toggleDark()
                refreshAppContext()
              }}
            />

            {/* 登录 / 用户菜单：登录态探测完成前只留等宽占位，避免先闪一下登录按钮 */}
            {!loginChecked ? (
              <span className="auth-slot" aria-hidden="true" />
            ) : !isLoggedIn ? (
              <Button type="primary" onClick={goLogin} icon={<LoginOutlined />}>
                {t('common.login')}
              </Button>
            ) : (
              <Dropdown trigger={['click']} menu={{ items: userMenuItems, onClick: handleUserMenu }}>
                <Button type="text" shape="circle" className="icon-btn" icon={<UserOutlined />} />
              </Dropdown>
            )}
          </div>
        </div>
      </header>

      {/* 移动端导航抽屉：复用 SideMenu（logo + 菜单） */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          placement="left"
          width={220}
          closable={false}
          styles={{ body: { padding: 0 } }}
          onClose={() => setDrawerOpen(false)}
        >
          <SideMenu
            theme={isDark ? 'dark' : 'light'}
            menus={drawerItems}
            onMenuClick={handleDrawerMenu}
            onLogoClick={handleLogoClick}
          />
        </Drawer>
      )}

      {/* 页面内容：子路由渲染在 Outlet */}
      <main className="page-main">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="site-footer">
        <span>AntX Frontend Template</span>
        <span>{t('landing.footer')}</span>
      </footer>
    </div>
  )
}
