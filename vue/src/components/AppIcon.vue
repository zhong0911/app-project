<script setup>
/**
 * 应用图标（Logo / Favicon 统一样式）
 *
 * 两种替换方式，二选一：
 * 1. 图片：把 imageUrl 填成图片地址（如 '/logo.png'、'https://.../logo.png'）
 * 2. 内联 SVG：imageUrl 留空，直接修改下面的 <svg> 代码
 */
import { computed } from 'vue'

const imageUrl = ''

const props = defineProps({
  size: { type: [Number, String], default: 40 },
  alt: { type: String, default: '应用图标' },
})

const sizeStyle = computed(() => {
  const value = typeof props.size === 'number' ? `${props.size}px` : props.size
  return { width: value, height: value }
})
</script>

<template>
  <img
    v-if="imageUrl"
    :src="imageUrl"
    :alt="alt"
    :style="sizeStyle"
    class="app-icon"
  />
  <!-- 默认内联 SVG：蓝色圆形 + 四宫格，与登录页、favicon 保持一致 -->
  <svg
    v-else
    :style="sizeStyle"
    class="app-icon"
    viewBox="0 0 48 48"
    role="img"
    :aria-label="alt"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="24" cy="24" r="24" fill="#4c8bf5" />
    <rect x="14" y="14" width="8" height="8" rx="2" fill="#ffffff" />
    <rect x="26" y="14" width="8" height="8" rx="2" fill="#ffffff" />
    <rect x="14" y="26" width="8" height="8" rx="2" fill="#ffffff" />
    <rect x="26" y="26" width="8" height="8" rx="2" fill="#ffffff" />
  </svg>
</template>

<style scoped>
.app-icon {
  display: block;
  flex: none;
}
</style>
