<script setup>
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <div class="not-found">
    <a-result status="404" title="404" :sub-title="t('notFound.subtitle')">
      <template #extra>
        <a-button type="primary" @click="router.push('/')">{{ t('notFound.back') }}</a-button>
      </template>
    </a-result>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100svh;
}
</style>
