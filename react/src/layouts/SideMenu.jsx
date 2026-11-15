import { Menu } from 'antd'
import { Link } from 'react-router-dom'

import AppIcon from '@/components/AppIcon'
import { APP_TITLE } from '@/config/app'

/**
 * 侧边菜单内容（logo + 菜单）：桌面 Sider 与移动端 Drawer 复用
 * logo（图标 + 标题）点击返回首页，两个布局都通过 onLogoClick 关闭自己的抽屉
 */
export default function SideMenu({
  theme = 'light',
  menus = [],
  selectedKeys = [],
  collapsed = false,
  onMenuClick,
  onLogoClick,
}) {
  return (
    <div className="side-menu">
      <Link to="/" className="logo" onClick={onLogoClick}>
        <AppIcon size={34} />
        {!collapsed && <span className="logo-text">{APP_TITLE}</span>}
      </Link>
      {/* 菜单 theme 跟随全局主题，背景色由 Layout token（siderBg/lightSiderBg）控制 */}
      <Menu
        theme={theme}
        mode="inline"
        selectedKeys={selectedKeys}
        items={menus}
        onClick={onMenuClick}
      />
    </div>
  )
}
