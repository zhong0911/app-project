import Cookies from 'js-cookie'
import dayjs from 'dayjs'
import { create } from 'zustand'

// dayjs 各语言 locale（切换语言时日期组件需要对应数据）
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/zh-tw'
import 'dayjs/locale/en'

import zhCN from 'antd/locale/zh_CN'
import zhTW from 'antd/locale/zh_TW'
import enUS from 'antd/locale/en_US'

// 语言切换用的旗帜（简体=中国旗 / 繁体=香港旗 / 英文=美国旗）
import flagCn from '@/assets/flags/cn.svg'
import flagHk from '@/assets/flags/hk.svg'
import flagUs from '@/assets/flags/us.svg'

import { setI18nLocale } from '@/locales'

/**
 * 全局 locale 配置中心（zustand）
 *
 * 同时负责：
 * 1. antd 组件层语言（App.jsx 传给 <ConfigProvider locale>）
 * 2. i18next 文案语言（src/locales/*，与这里共用语言 key）
 * 3. dayjs 日期语言
 *
 * 默认只支持：简体中文 / 繁體中文 / English。
 */
const LOCALE_KEY = 'app-locale'

/** 支持的语言（antd: antd 语言包；dayjs: dayjs locale 名；flag: 语言切换展示的旗帜） */
export const LOCALES = [
  { key: 'zh-CN', label: '简体中文', dayjs: 'zh-cn', antd: zhCN, flag: flagCn },
  { key: 'zh-TW', label: '繁體中文', dayjs: 'zh-tw', antd: zhTW, flag: flagHk },
  { key: 'en-US', label: 'English', dayjs: 'en', antd: enUS, flag: flagUs },
]

function initialKey() {
  const saved = localStorage.getItem(LOCALE_KEY) || Cookies.get(LOCALE_KEY)
  // 兼容旧版本存下来的 ja-JP / fr-FR 等已移除语言
  return LOCALES.some((l) => l.key === saved) ? saved : 'zh-CN'
}

const initial = initialKey()
const initialItem = LOCALES.find((l) => l.key === initial) || LOCALES[0]

// 模块加载即同步 i18next / dayjs / <html lang>
setI18nLocale(initialItem.key)
dayjs.locale(initialItem.dayjs)

export const useLocaleStore = create((set) => ({
  key: initialItem.key,
  /** 当前语言配置项（含 antd 语言包、dayjs 名） */
  locale: initialItem,

  /** 切换语言：更新状态 + 持久化 + 同步 i18next / dayjs / html lang */
  setLocale: (key) => {
    const item = LOCALES.find((l) => l.key === key)
    if (!item) return
    localStorage.setItem(LOCALE_KEY, key)
    Cookies.set(LOCALE_KEY, key, { expires: 365, path: '/', sameSite: 'lax' })
    setI18nLocale(key)
    dayjs.locale(item.dayjs)
    set({ key: item.key, locale: item })
  },
}))
