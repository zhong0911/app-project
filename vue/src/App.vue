<script setup>
import { computed, watch } from 'vue'

import { antdLocale } from '@/config/locale'
import { getThemeConfig } from '@/config/theme'
import { useAppStore } from '@/stores/modules/app'
import { refreshAppContext } from '@/utils/app'

const appStore = useAppStore()

// 主题配置：亮/暗两套，切换时同步刷新全局弹层（utils/app.js 的 holder）
const themeConfig = computed(() => getThemeConfig(appStore.isDark))

// 主题变化时：同步 <html> 的 dark 类 + 刷新全局静态弹层配置
// index.html 里的预置脚本会先打一次 dark 类与底色（防止暗色模式白闪），这里切换时一并更新底色与 color-scheme
watch(
  () => appStore.isDark,
  (val) => {
    const root = document.documentElement
    root.classList.toggle('dark', val)
    root.style.colorScheme = val ? 'dark' : 'light'
    root.style.backgroundColor = val ? '#12141b' : '#f0f4fc'
    refreshAppContext()
  },
  { immediate: true },
)

// 语言变化时：刷新全局静态弹层配置（使其跟随新语言包）
watch(
  () => antdLocale.value,
  () => refreshAppContext(),
)
</script>

<template>
  <!-- 全局化配置：主题算法/token + 全局 locale 语言包；a-app 为组件内 useApp() 提供 context -->
  <a-config-provider :locale="antdLocale" :theme="themeConfig">
    <a-app>
      <router-view />
    </a-app>
  </a-config-provider>
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  transition: background-color 0.3s ease, color 0.3s ease;
}
</style>
