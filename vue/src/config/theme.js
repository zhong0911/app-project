import { theme } from 'antdv-next'

const { defaultAlgorithm, darkAlgorithm } = theme

/**
 * 全局主题配置（亮/暗两套）
 * 供 App.vue 的 <a-config-provider :theme> 与 utils/app.js 的全局 holder 共用。
 */

/** 亮色主题 token */
export const lightTheme = {
  algorithm: defaultAlgorithm,
  token: {
    colorBgLayout: '#f0f5fc',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorPrimary: '#4c8bf5',
    colorLink: '#4c8bf5',
    colorText: '#1e2a3a',
    colorTextSecondary: '#4a5a6e',
  },
  components: {
    Layout: {
      lightSiderBg: '#ffffff',
      siderBg: '#ffffff',
      headerBg: '#ffffff',
      bodyBg: '#f0f5fc',
    },
    // 抽屉背景与侧边栏一致（默认 colorBgElevated 亮灰会与深色菜单脱节）
    Drawer: {
      colorBgElevated: '#ffffff',
    },
  },
}

/** 暗色主题 token */
export const darkTheme = {
  algorithm: darkAlgorithm,
  token: {
    colorPrimary: '#4c8bf5',
    // 布局透明，露出 html::before 全局渐变背景（index.css）
    colorBgLayout: 'transparent',
    colorBgContainer: '#1a1c26',
    colorBgElevated: '#161822',
  },
  components: {
    Layout: {
      lightSiderBg: '#12141b',
      siderBg: '#12141b',
      headerBg: '#22242f',
      bodyBg: 'transparent',
    },
    // 抽屉背景与侧边栏一致（默认 colorBgElevated 亮灰会与深色菜单脱节）
    Drawer: {
      colorBgElevated: '#12141b',
    },
    // 暗色菜单背景与侧边栏保持一致（默认深蓝 #001529 会与主题脱节）
    Menu: {
      darkItemBg: '#12141b',
      darkSubMenuItemBg: '#16181f',
      darkItemSelectedBg: '#4c8bf5',
      darkItemSelectedColor: '#ffffff',
      darkItemHoverColor: '#ffffff',
    },
  },
}

/** 按当前暗色状态取主题配置 */
export function getThemeConfig(isDark) {
  return isDark ? darkTheme : lightTheme
}
