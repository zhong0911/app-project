import { createI18n } from 'vue-i18n'

import zhCN from './zh-CN'
import zhTW from './zh-TW'
import enUS from './en-US'

/**
 * 国际化实例（vue-i18n）
 *
 * - 默认语言：简体中文
 * - 与 config/locale.js 共用同一套语言 key（zh-CN / zh-TW / en-US），
 *   antdv-next 组件语言包由 locale.js 同步切换
 * - 项目可选择性使用：组件内调用 useI18n() 才会启用翻译；
 *   未接入的页面保持原文，删除方法见 README「国际化」章节
 */
export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    'en-US': enUS,
  },
})

/** 切换 vue-i18n 语言，并同步 <html lang> */
export function setI18nLocale(key) {
  i18n.global.locale.value = key
  if (typeof document !== 'undefined') {
    document.documentElement.lang = key
  }
}
