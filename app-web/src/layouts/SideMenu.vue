<script setup>
// 侧边菜单内容（logo + 菜单）：桌面 Sider 与移动端 Drawer 复用
defineProps({
  theme: { type: String, default: 'light' },
  menus: { type: Array, default: () => [] },
  selectedKeys: { type: Array, default: () => [] },
  collapsed: { type: Boolean, default: false },
})

defineEmits(['menu-click'])

// 应用标题首字符（模板中不能直接写 import.meta.env，需先定义到变量）
const appTitleInitial = import.meta.env.VITE_APP_TITLE?.slice(0, 1) || 'A'
</script>

<template>
  <div class="side-menu">
    <div class="logo">
      <a-avatar style="background-color: #4c8bf5">
        {{ appTitleInitial }}
      </a-avatar>
      <span v-if="!collapsed" class="logo-text">AntdvNext</span>
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
  gap: 8px;
  height: 64px;
  font-size: 16px;
  font-weight: 600;
}

.logo-text {
  white-space: nowrap;
  overflow: hidden;
}
</style>
