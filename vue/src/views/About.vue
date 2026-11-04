<script setup>
// 关于页
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="page">
    <a-typography>
      <a-typography-title :level="2">{{ t('about.title') }}</a-typography-title>
      <a-typography-paragraph>{{ t('about.desc') }}</a-typography-paragraph>
    </a-typography>

    <a-descriptions bordered :column="1" style="max-width: 480px">
      <a-descriptions-item :label="t('about.framework')">{{ t('about.frameworkValue') }}</a-descriptions-item>
      <a-descriptions-item :label="t('about.build')">{{ t('about.buildValue') }}</a-descriptions-item>
      <a-descriptions-item :label="t('about.router')">{{ t('about.routerValue') }}</a-descriptions-item>
      <a-descriptions-item :label="t('about.store')">{{ t('about.storeValue') }}</a-descriptions-item>
      <a-descriptions-item :label="t('about.request')">{{ t('about.requestValue') }}</a-descriptions-item>
      <a-descriptions-item :label="t('about.ui')">{{ t('about.uiValue') }}</a-descriptions-item>
      <a-descriptions-item :label="t('about.icons')">{{ t('about.iconsValue') }}</a-descriptions-item>
    </a-descriptions>
  </div>
</template>

<style scoped>
.page {
  padding: 8px;
}
</style>
