import { computed, ref } from 'vue'
import Cookies from 'js-cookie'
import dayjs from 'dayjs'

// dayjs 各语言 locale（切换语言时日期组件需要对应数据）
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/zh-tw'
import 'dayjs/locale/en'
import 'dayjs/locale/ja'
import 'dayjs/locale/fr'
import 'dayjs/locale/ru'

import zhCN from 'antdv-next/locale/zh_CN'
import zhTW from 'antdv-next/locale/zh_TW'
import enUS from 'antdv-next/locale/en_US'
import jaJP from 'antdv-next/locale/ja_JP'
import frFR from 'antdv-next/locale/fr_FR'
import ruRU from 'antdv-next/locale/ru_RU'

/**
 * 全局 locale 配置中心
 *
 * 只负责 antdv-next 组件层语言：App.vue 将 antdLocale 传给 <a-config-provider :locale>，
 * 组件文案（分页、日期、弹窗按钮等）自动跟随。业务页面文案按中文书写，不做翻译。
 */
const LOCALE_KEY = 'app-locale'

/** 支持的语言（antd: antdv-next 语言包；dayjs: dayjs locale 名） */
export const LOCALES = [
  { key: 'zh-CN', label: '简体中文', dayjs: 'zh-cn', antd: zhCN },
  { key: 'zh-TW', label: '繁體中文', dayjs: 'zh-tw', antd: zhTW },
  { key: 'en-US', label: 'English', dayjs: 'en', antd: enUS },
  { key: 'ja-JP', label: '日本語', dayjs: 'ja', antd: jaJP },
  { key: 'fr-FR', label: 'Français', dayjs: 'fr', antd: frFR },
  { key: 'ru-RU', label: 'Русский', dayjs: 'ru', antd: ruRU },
]

/** 当前语言 key（全局响应式状态，持久化 localStorage + Cookie） */
const currentKey = ref(
  localStorage.getItem(LOCALE_KEY) || Cookies.get(LOCALE_KEY) || 'zh-CN',
)

/** 当前语言配置项 */
export const currentLocale = computed(
  () => LOCALES.find((l) => l.key === currentKey.value) || LOCALES[0],
)

// 模块加载即同步 dayjs（antdv 日期组件依赖）
dayjs.locale(currentLocale.value.dayjs)

/** 当前 antdv-next 语言包（传给 <a-config-provider :locale>） */
export const antdLocale = computed(() => currentLocale.value.antd)

/** 当前语言 key（响应式，用于菜单选中态等） */
export const localeKey = computed(() => currentLocale.value.key)

/** 切换语言：更新状态 + 持久化 + 同步 dayjs */
export function setLocale(key) {
  const item = LOCALES.find((l) => l.key === key)
  if (!item) return
  currentKey.value = key
  localStorage.setItem(LOCALE_KEY, key)
  Cookies.set(LOCALE_KEY, key, { expires: 365, path: '/', sameSite: 'lax' })
  dayjs.locale(item.dayjs)
}
