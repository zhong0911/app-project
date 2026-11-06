<script setup>
// 登录页（独立布局）：PaaS 控制台本地账号登录，兼容原模板的 SSO 入口
// 暗色适配：页面底色用全局渐变（html::before），文字色用全局 CSS 变量，
// 卡片/按钮等 antd 组件由 ConfigProvider 主题算法自动切换，无需页面级处理
// 支持 ?redirect_uri=/xxx：登录成功后回跳该地址
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LoginOutlined, LockOutlined, UserOutlined } from '@antdv-next/icons'
import AppIcon from '@/components/AppIcon.vue'
import { APP_TITLE } from '@/config/app'
import { useUserStore } from '@/stores/modules/user'
import { message } from '@/utils/app'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const form = reactive({ username: '', password: '' })
const loading = ref(false)

onMounted(async () => {
  await userStore.fetchLoginUser()
  if (userStore.isLoggedIn) {
    router.replace(route.query.redirect_uri || '/')
  }
})

async function handleLogin() {
  if (!form.username || !form.password) {
    message.warning(t('login.required'))
    return
  }
  loading.value = true
  try {
    await userStore.loginWithPassword(form.username.trim(), form.password)
    message.success(t('login.success'))
    router.replace(route.query.redirect_uri || '/apps')
  } catch (error) {
    message.error(error?.response?.data?.message || t('login.failed'))
  } finally {
    loading.value = false
  }
}

function handleSsoLogin() {
  userStore.loginWithSso(route.query.redirect_uri || '')
}
</script>

<template>
  <div class="login-page">
    <a-card class="login-card" variant="borderless">
      <AppIcon :size="56" class="login-icon" />

      <a-typography-title :level="3" class="login-title">{{ APP_TITLE }}</a-typography-title>

      <a-typography-paragraph class="login-subtitle">
        {{ t('login.subtitle') }}
      </a-typography-paragraph>

      <a-form :model="form" layout="vertical" @submit.prevent="handleLogin">
        <a-form-item :label="t('login.username')">
          <a-input v-model:value="form.username" size="large" :placeholder="t('login.usernamePlaceholder')">
            <template #prefix><UserOutlined /></template>
          </a-input>
        </a-form-item>
        <a-form-item :label="t('login.password')">
          <a-input-password
            v-model:value="form.password"
            size="large"
            :placeholder="t('login.passwordPlaceholder')"
            @press-enter="handleLogin"
          >
            <template #prefix><LockOutlined /></template>
          </a-input-password>
        </a-form-item>
        <a-button type="primary" size="large" block :loading="loading" @click="handleLogin">
          <LoginOutlined />
          {{ t('login.button') }}
        </a-button>
      </a-form>

      <a-divider class="login-divider">{{ t('login.or') }}</a-divider>

      <a-button size="large" block @click="handleSsoLogin">{{ t('login.ssoButton') }}</a-button>

      <p class="login-hint">{{ t('login.hint') }}</p>
    </a-card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
}

.login-icon {
  margin: 8px auto 16px;
}

.login-title {
  margin-bottom: 8px;
  text-align: center;
}

.login-subtitle {
  color: var(--text-secondary);
  margin-bottom: 24px;
  text-align: center;
}

.login-divider {
  font-size: 12px;
  color: var(--text-tertiary);
}

.login-hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
}
</style>
