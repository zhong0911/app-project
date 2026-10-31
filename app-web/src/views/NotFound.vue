<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <a-result status="404" title="404" sub-title="抱歉，你访问的页面不存在。">
      <template #extra>
        <a-button type="primary" @click="router.push('/')">返回首页</a-button>
      </template>
    </a-result>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
</style>
