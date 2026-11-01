<script setup>
// 关于页
</script>

<template>
  <div class="page">
    <a-typography>
      <a-typography-title :level="2">关于</a-typography-title>
      <a-typography-paragraph>
        本模板使用的技术栈与版本如下，详见项目根目录 README.md。
      </a-typography-paragraph>
    </a-typography>

    <a-descriptions bordered :column="1" style="max-width: 480px">
      <a-descriptions-item label="前端框架">Vue 3（Composition API / script setup）</a-descriptions-item>
      <a-descriptions-item label="构建工具">Vite 5</a-descriptions-item>
      <a-descriptions-item label="路由">Vue Router 4</a-descriptions-item>
      <a-descriptions-item label="状态管理">Pinia 2</a-descriptions-item>
      <a-descriptions-item label="网络请求">Axios 1.x（已封装拦截器）</a-descriptions-item>
      <a-descriptions-item label="UI 组件库">AntdvNext（Ant Design Vue 下一代）</a-descriptions-item>
      <a-descriptions-item label="图标">@antdv-next/icons</a-descriptions-item>
    </a-descriptions>
  </div>
</template>

<style scoped>
.page {
  padding: 8px;
}
</style>
