<script setup>
// 登录页（独立于 ConsoleLayout）：标题/介绍为占位文案，按业务替换
// 暗色适配：页面底色用全局渐变（html::before），文字色用全局 CSS 变量，
// 卡片/按钮等 antd 组件由 ConfigProvider 主题算法自动切换，无需页面级处理
// 支持 ?redirect_uri=/xxx：SSO 登录成功后回跳该地址（见 stores/modules/user.js#loginWithSso）
import { AppstoreOutlined, LoginOutlined } from '@antdv-next/icons'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/modules/user'

const route = useRoute()
const userStore = useUserStore()

function handleSsoLogin() {
  userStore.loginWithSso(route.query.redirect_uri || '')
}
</script>

<template>
  <div class="login-page">
    <a-card class="login-card" variant="borderless">
      <!-- 应用图标占位 -->
      <div class="login-icon"><AppstoreOutlined /></div>

      <!-- 应用标题占位 -->
      <a-typography-title :level="3" class="login-title">应用标题占位</a-typography-title>

      <!-- 应用介绍占位 -->
      <a-typography-paragraph class="login-subtitle">
        应用介绍占位文案
      </a-typography-paragraph>

      <!-- SSO 登录（整页跳转后端 /sso/authorize；带 redirect_uri 时登录后回跳） -->
      <a-button type="primary" size="large" block @click="handleSsoLogin">
        <LoginOutlined />
        SSO 登录
      </a-button>

      <p class="login-hint">将跳转 passport.antx.cc 完成认证后自动返回</p>
    </a-card>
  </div>
</template>

<style scoped>
/* 透明背景露出全局渐变底色（亮/暗自动跟随 html.dark） */
.login-page {
  min-height: 100vh;
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

/* 圆形应用图标（主色 #4c8bf5，与全局主题 token 一致） */
.login-icon {
  width: 56px;
  height: 56px;
  margin: 8px auto 16px;
  border-radius: 50%;
  background: #4c8bf5;
  color: #fff;
  font-size: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
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
