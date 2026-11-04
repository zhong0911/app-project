import { h } from 'vue'
import { App, ConfigProvider, message as antdMessage, notification as antdNotification, Modal as antdModal } from 'antdv-next'
import { antdLocale } from '@/config/locale'
import { getThemeConfig } from '@/config/theme'
import { useAppStore } from '@/stores/modules/app'

/**
 * 全局 App context 配置（antdv-next 官方 ConfigProvider.config 方案）
 *
 * antdv-next 的静态方法（message / notification / Modal.confirm 等）无法直接消费
 * <a-config-provider> 提供的 context（语言、暗色主题等）。官方解法是调用
 * ConfigProvider.config() 提供全局 holderRender：静态方法渲染弹层时，会先经过
 * 这里的 ConfigProvider + <a-app> 包裹，从而继承全局语言与主题。
 *
 * 用法：
 * 1. 在 main.js 中调用 setupAppContext() 完成初始化；
 * 2. 语言 / 主题切换后调用 refreshAppContext() 让弹层跟随最新配置；
 * 3. 任意 JS 模块 import { message } from '@/utils/app' 即可使用。
 */

/**
 * 静态弹层距顶部间距：两套布局的顶栏都是 64px（落地页还是吸顶 sticky），
 * 而组件库默认 top: 8px —— toast / notification 会正好压在顶栏上，看起来像"只能在 header 里显示"。
 * 统一下移到顶栏之下 8px。
 */
const POPUP_TOP = 72

/** 初始化全局 holder：把静态弹层渲染进 ConfigProvider(语言/主题) + a-app */
function applyGlobalConfig() {
  ConfigProvider.config({
    holderRender: (children) =>
      h(
        ConfigProvider,
        { locale: antdLocale.value, theme: getThemeConfig(useAppStore().isDark) },
        { default: () => h(App, null, () => children) },
      ),
  })
  // 弹层位置：落在顶栏之下，避免被吸顶 header 挡住
  antdMessage.config({ top: POPUP_TOP })
  antdNotification.config({ top: POPUP_TOP })
}

/** 应用启动时初始化（main.js 调用） */
export function setupAppContext() {
  applyGlobalConfig()
}

/** 语言 / 主题变化后刷新全局弹层配置 */
export function refreshAppContext() {
  applyGlobalConfig()
}

/**
 * 全局可用的静态方法（带 ConfigProvider context）
 * 直接复用 antdv-next 的静态实现，无需 Proxy 桥接。
 */
export const message = antdMessage
export const notification = antdNotification
export const modal = antdModal

/**
 * 切换亮色/暗色主题
 * 内部复用 store 的 toggleDark：同步 localStorage + Cookie（theme-mode）与 <html> 的 dark 类。
 * @returns {boolean} 切换后的暗色状态（true=暗色）
 */
export function toggleTheme() {
  const appStore = useAppStore()
  appStore.toggleDark()
  refreshAppContext()
  return appStore.isDark
}

export default { message, notification, modal, setupAppContext, refreshAppContext, toggleTheme }
