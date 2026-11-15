<script setup>
// 登录页（独立布局）：标题取 VITE_APP_TITLE，可替换为业务文案
// 暗色适配：页面底色用全局渐变（html::before），文字色用全局 CSS 变量，
// 卡片/按钮等 antd 组件由 ConfigProvider 主题算法自动切换，无需页面级处理
// 支持 ?redirect_uri=/xxx：SSO 登录成功后回跳该地址（见 stores/modules/user.js#loginWithSso）
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LoginOutlined } from '@antdv-next/icons'
import AppIcon from '@/components/AppIcon.vue'
import { APP_TITLE } from '@/config/app'
import { useUserStore } from '@/stores/modules/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

// 已登录用户访问登录页时直接回跳，避免重复走 SSO 授权
onMounted(async () => {
  await userStore.fetchLoginUser()
  if (userStore.isLoggedIn) {
    // 优先用页面参数，其次用登录前暂存的回跳地址（消费后清除）
    const target = route.query.redirect_uri || userStore.readRedirectUri() || '/'
    userStore.clearRedirectUri()
    userStore.markLoggedIn()
    router.replace(target)
  }
})

function handleSsoLogin() {
  // 回跳优先级：页面参数 > 登录前暂存的地址 > 首页；后端拿到后会在 SSO 回调成功时直接跳过去
  userStore.loginWithSso(route.query.redirect_uri || userStore.readRedirectUri() || '/')
}
</script>

<template>
  <div class="login-page">
    <a-card class="login-card" variant="borderless">
      <!-- 应用图标：统一使用 AppIcon（与 favicon、布局 logo 一致）；点击返回首页 -->
      <router-link to="/" class="login-home" :aria-label="t('nav.home')">
        <AppIcon :size="56" class="login-icon" />
      </router-link>

      <a-typography-title :level="3" class="login-title">{{ APP_TITLE }}</a-typography-title>

      <a-typography-paragraph class="login-subtitle">
        {{ t('login.subtitle') }}
      </a-typography-paragraph>

      <!-- SSO 登录（整页跳转后端 /sso/authorize；带 redirect_uri 时登录后回跳） -->
      <a-button type="primary" size="large" block @click="handleSsoLogin">
        <LoginOutlined />
        {{ t('login.ssoButton') }}
      </a-button>

      <p class="login-hint">{{ t('login.hint') }}</p>
    </a-card>
  </div>
</template>

<style scoped>
/* 透明背景露出全局渐变底色（亮/暗自动跟随 html.dark） */
.login-page {
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 380px;
  text-align: center;
  border-radius: 12px;
}

/* 应用图标（圆形样式由 AppIcon 统一提供，这里只负责居中与间距）；
   外层 router-link 撑满宽度让图标居中，点击可回首页 */
.login-home {
  display: flex;
  justify-content: center;
  width: 100%;
}

.login-icon {
  margin: 8px auto 16px;
}

.login-title {
  margin-bottom: 8px;
}

.login-subtitle {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.login-hint {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
}
</style>
