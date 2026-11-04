<script setup>
// 侧边菜单内容（logo + 菜单）：桌面 Sider 与移动端 Drawer 复用
import AppIcon from '@/components/AppIcon.vue'
import { APP_TITLE } from '@/config/app'

defineProps({
  theme: { type: String, default: 'light' },
  menus: { type: Array, default: () => [] },
  selectedKeys: { type: Array, default: () => [] },
  collapsed: { type: Boolean, default: false },
})

defineEmits(['menu-click'])
</script>

<template>
  <div class="side-menu">
    <div class="logo">
      <AppIcon :size="34" />
      <span v-if="!collapsed" class="logo-text">{{ APP_TITLE }}</span>
    </div>
    <!-- 菜单 theme 跟随全局主题，背景色由 Layout token（siderBg/lightSiderBg）控制 -->
    <a-menu
      :theme="theme"
      mode="inline"
      :selected-keys="selectedKeys"
      :items="menus"
      @click="$emit('menu-click', $event)"
    />
  </div>
</template>

<style scoped>
/* 结构样式：文字颜色交给主题 token（colorText），亮暗自动适配 */
.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 64px;
  padding: 0 12px;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
}

.logo-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
