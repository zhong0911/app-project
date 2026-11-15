<script setup>
// 退出登录页（独立于 ConsoleLayout）：
// 进入不自动请求，点击「退出登录」按钮后才请求后端单点退出接口 POST /api/auth/logout，
// 请求期间 a-spin 展示 loading；请求结束显示 a-result 退出成功 + 「首页 / 登录」两个按钮；
// 若后端返回 ssoLogoutUrl（配置了 SSO_LOGOUT_URI）则直接整页跳转授权服务器完成全局退出。
// 暗色适配走全局 CSS 变量 + antd 主题，页面本身无需处理。
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/modules/user'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

// 退出状态：confirm 待确认 / loading 请求后端中 / done 已退出
// loading 期间仍保留 confirm 内容（a-spin 半透明遮罩 + 禁点），避免卡片高度跳动
const state = ref('confirm')

async function handleLogout() {
  state.value = 'loading'
  try {
    const ssoLogoutUrl = await userStore.logout()
    if (ssoLogoutUrl) {
      // SSO 全局退出：整页跳转授权服务器登出端点
      window.location.replace(ssoLogoutUrl)
      return
    }
  } catch {
    // 后端退出失败（如会话已过期）不影响本地登出
  }
  state.value = 'done'
}
</script>

<template>
  <div class="logout-page">
    <a-card class="logout-card" variant="borderless">
      <a-spin :spinning="state === 'loading'" size="large" :description="t('logout.loading')">
        <div class="logout-body">
          <!-- 待确认 + 请求中：点击后才请求退出；loading 时保留同一块内容，
               a-spin 以遮罩形式叠加（容器 pointer-events: none），卡片高度不变 -->
          <a-result v-if="state !== 'done'" :title="t('common.logout')">
            <template #subTitle>
              <p class="logout-sub">{{ t('logout.confirm') }}</p>
            </template>
            <template #extra>
              <a-button @click="router.back()">{{ t('logout.cancel') }}</a-button>
              <a-button type="primary" danger @click="handleLogout">{{ t('common.logout') }}</a-button>
            </template>
          </a-result>

          <!-- 已退出：返回首页 / 重新登录 -->
          <a-result
            v-else-if="state === 'done'"
            status="success"
            :title="t('logout.successTitle')"
            :sub-title="t('logout.successDesc')"
          >
            <template #extra>
              <a-button @click="router.replace('/home')">{{ t('logout.home') }}</a-button>
              <a-button type="primary" @click="router.replace('/login')">{{ t('logout.relogin') }}</a-button>
            </template>
          </a-result>
        </div>
      </a-spin>
    </a-card>
  </div>
</template>

<style scoped>
/* 透明背景露出全局渐变底色（亮/暗自动跟随 html.dark） */
.logout-page {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.logout-card {
  width: 100%;
  max-width: 380px;
  border-radius: 12px;
}

/* loading 占位高度（a-result 渲染后由内容撑开） */
.logout-body {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-sub {
  color: var(--text-secondary);
}
</style>
