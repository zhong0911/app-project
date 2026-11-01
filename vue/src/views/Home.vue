<script setup>
import { ref } from 'vue'
// 全局 app context：在任意 JS 中调用（自动消费 ConfigProvider 的语言/暗色主题）
import { message, notification, modal } from '@/utils/app'

const count = ref(0)

function handleMessage() {
  message.success('这是一条成功提示（来自全局 message）')
}

function handleNotification() {
  notification.open({
    message: '通知标题',
    description: '这是一条全局 notification，样式跟随当前主题。',
    placement: 'topRight',
  })
}

function handleModal() {
  modal.confirm({
    title: '确认操作',
    content: '这是全局 modal，确认后执行。',
    onOk() {
      message.info('你点击了确定')
    },
  })
}
</script>

<template>
  <div class="page">
    <a-typography>
      <a-typography-title :level="2">首页</a-typography-title>
      <a-typography-paragraph>
        这是一个基于 <b>Vue3 + Vite + Pinia + Vue Router + Axios + AntdvNext + Tailwind</b> 的项目模板。
      </a-typography-paragraph>
    </a-typography>

    <!-- Tailwind 工具类示例 -->
    <div class="flex flex-wrap gap-3 mb-6">
      <span class="px-3 py-1 bg-blue-500 text-white text-sm">Tailwind</span>
      <span
        class="px-3 py-1 bg-gray-200 text-gray-700 text-sm dark:bg-gray-700 dark:text-gray-200"
      >
        工具类（暗色适配）
      </span>
    </div>

    <!-- 示例：AntdvNext 组件与状态 -->
    <a-space>
      <a-button type="primary" @click="count++">
        点击次数：{{ count }}
      </a-button>
      <a-button type="primary" danger @click="count = 0">重置</a-button>
    </a-space>

    <!-- 全局 context 演示 -->
    <a-card style="margin-top: 16px" title="全局 message / notification / modal（utils/app.js）">
      <a-space wrap>
        <a-button @click="handleMessage">全局 message</a-button>
        <a-button @click="handleNotification">全局 notification</a-button>
        <a-button @click="handleModal">全局 modal</a-button>
      </a-space>
      <p style="margin-top: 12px; color: #999">
        在任意 JS（如 api/request.js 拦截器）中 import { message, notification, modal } from '@/utils/app'
        即可使用，样式与暗色主题自动跟随全局配置。
      </p>
    </a-card>
  </div>
</template>

<style scoped>
.page {
  padding: 8px;
}
</style>
