import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import zhCN from './zh-CN'
import zhTW from './zh-TW'
import enUS from './en-US'

/**
 * 国际化实例（i18next + react-i18next）
 *
 * - 默认语言：简体中文
 * - 与 config/locale.js 共用同一套语言 key（zh-CN / zh-TW / en-US），
 *   antd 组件语言包由 locale.js 同步切换
 * - 组件内用 useTranslation() 取 t()；未接入的页面保持原文，
 *   删除方法见 README「国际化」章节
 */
i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'zh-TW': { translation: zhTW },
    'en-US': { translation: enUS },
  },
  lng: 'zh-CN',
  fallbackLng: 'zh-CN',
  // 沿用 vue-i18n 的插值写法：文案里是 {total} / {name} 单花括号，
  // i18next 默认用 {{total}}，这里把定界符改成单花括号，语言包可直接复用
  interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
})

/** 切换 i18next 语言，并同步 <html lang> */
export function setI18nLocale(key) {
  i18n.changeLanguage(key)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = key
  }
}

export default i18n
