import { computed, ref } from 'vue'
import Cookies from 'js-cookie'
import dayjs from 'dayjs'

// dayjs 各语言 locale（切换语言时日期组件需要对应数据）
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/zh-tw'
import 'dayjs/locale/en'

import zhCN from 'antdv-next/locale/zh_CN'
import zhTW from 'antdv-next/locale/zh_TW'
import enUS from 'antdv-next/locale/en_US'

// 语言切换用的旗帜（简体=中国旗 / 繁体=香港旗 / 英文=美国旗）
import flagCn from '@/assets/flags/cn.svg'
import flagHk from '@/assets/flags/hk.svg'
import flagUs from '@/assets/flags/us.svg'

import { setI18nLocale } from '@/locales'

/**
 * 全局 locale 配置中心
 *
 * 同时负责：
 * 1. antdv-next 组件层语言（App.vue 传给 <a-config-provider :locale>）
 * 2. vue-i18n 文案语言（src/locales/*，与这里共用语言 key）
 * 3. dayjs 日期语言
 *
 * 默认只支持：简体中文 / 繁體中文 / English。
 */
const LOCALE_KEY = 'app-locale'

/** 支持的语言（antd: antdv-next 语言包；dayjs: dayjs locale 名；flag: 语言切换展示的旗帜） */
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

/** 当前语言 key（全局响应式状态，持久化 localStorage + Cookie） */
const currentKey = ref(initialKey())

/** 当前语言配置项 */
export const currentLocale = computed(
  () => LOCALES.find((l) => l.key === currentKey.value) || LOCALES[0],
)

// 模块加载即同步 vue-i18n / dayjs / <html lang>
setI18nLocale(currentKey.value)
dayjs.locale(currentLocale.value.dayjs)

/** 当前 antdv-next 语言包（传给 <a-config-provider :locale>） */
export const antdLocale = computed(() => currentLocale.value.antd)

/** 当前语言 key（响应式，用于菜单选中态等） */
export const localeKey = computed(() => currentLocale.value.key)

/** 切换语言：更新状态 + 持久化 + 同步 i18n / dayjs / html lang */
export function setLocale(key) {
  const item = LOCALES.find((l) => l.key === key)
  if (!item) return
  currentKey.value = key
  localStorage.setItem(LOCALE_KEY, key)
  Cookies.set(LOCALE_KEY, key, { expires: 365, path: '/', sameSite: 'lax' })
  setI18nLocale(key)
  dayjs.locale(item.dayjs)
}
