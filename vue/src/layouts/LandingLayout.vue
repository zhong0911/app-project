<script setup>
// 落地页布局（LandingLayout）：顶部 header + 内容插槽 + 页脚，无侧边菜单
// 用于首页等对外展示页面；后台/示例页面使用 ConsoleLayout
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  GlobalOutlined,
  SunOutlined,
  MoonOutlined,
  LoginOutlined,
  LogoutOutlined,
  UserOutlined,
  SettingOutlined,
} from '@antdv-next/icons'
import AppIcon from '@/components/AppIcon.vue'
import { LOCALES, currentLocale, localeKey, setLocale } from '@/config/locale'
import { useAppStore } from '@/stores/modules/app'
import { useUserStore } from '@/stores/modules/user'
import { toggleTheme } from '@/utils/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const { t } = useI18n()

const currentLocaleLabel = computed(() => currentLocale.value.label)
const userMenuItems = computed(() => {
  const items = []
  if (userStore.isAdmin) {
    items.push({ key: 'admin', label: t('common.adminPanel'), icon: SettingOutlined })
  }
  items.push({ key: 'logout', label: t('common.logout'), icon: LogoutOutlined })
  return items
})

function handleLocaleChange({ key }) {
  setLocale(key)
}

function handleUserMenu({ key }) {
  if (key === 'admin') {
    router.push('/admin/users')
  } else if (key === 'logout') {
    router.push('/logout')
  }
}

function goLogin() {
  router.push({ path: '/login', query: { redirect_uri: route.fullPath } })
}

onMounted(async () => {
  await userStore.fetchLoginUser()
  // 从 SSO 授权页回来后恢复跳转（回跳地址存 localStorage，带 30 分钟过期）
  const redirect = userStore.readRedirectUri()
  if (redirect && userStore.isLoggedIn) {
    userStore.clearRedirectUri()
    userStore.markLoggedIn()
    router.replace(redirect)
  }
})
</script>

<template>
  <div class="landing-layout">
    <!-- 顶部 header：品牌 + 导航 + 语言 / 主题 / 登录 -->
    <header class="site-header">
      <div class="header-inner">
        <router-link to="/" class="brand">
          <AppIcon :size="36" />
          <span class="brand-text">
            <strong>AntX Frontend</strong>
            <small>{{ t('landing.brandSubtitle') }}</small>
          </span>
        </router-link>

        <nav class="site-nav">
          <a href="#intro">{{ t('nav.intro') }}</a>
          <a href="#stack">{{ t('nav.stack') }}</a>
          <a href="#usage">{{ t('nav.usage') }}</a>
          <a href="#structure">{{ t('nav.structure') }}</a>
          <router-link to="/components">{{ t('nav.components') }}</router-link>
        </nav>

        <div class="header-actions">
          <!-- 语言切换 -->
          <a-dropdown
            :trigger="['click']"
            :menu="{
              items: LOCALES.map((l) => ({ key: l.key, label: l.label })),
              selectable: true,
              selectedKeys: [localeKey],
            }"
            @menu-click="handleLocaleChange"
          >
            <a-button type="text" class="icon-btn">
              <GlobalOutlined />
              <span class="lang-label">{{ currentLocaleLabel }}</span>
            </a-button>
          </a-dropdown>

          <!-- 主题切换 -->
          <a-tooltip :title="appStore.isDark ? t('common.toLight') : t('common.toDark')">
            <a-button type="text" shape="circle" class="icon-btn" @click="toggleTheme">
              <component :is="appStore.isDark ? SunOutlined : MoonOutlined" />
            </a-button>
          </a-tooltip>

          <!-- 登录 / 用户菜单 -->
          <a-button v-if="!userStore.isLoggedIn" type="primary" @click="goLogin">
            <LoginOutlined />
            {{ t('common.login') }}
          </a-button>
          <a-dropdown
            v-else
            :trigger="['click']"
            :menu="{ items: userMenuItems }"
            @menu-click="handleUserMenu"
          >
            <a-button class="user-btn">
              <UserOutlined />
              <span class="user-name">{{ userStore.displayName || t('common.loggedIn') }}</span>
            </a-button>
          </a-dropdown>
        </div>
      </div>
    </header>

    <!-- 页面内容：作为路由布局使用，子路由渲染在 router-view -->
    <main class="page-main">
      <router-view />
    </main>

    <footer class="site-footer">
      <span>AntX Frontend Template</span>
      <span>{{ t('landing.footer') }}</span>
    </footer>
  </div>
</template>

<style scoped>
.landing-layout {
  min-height: 100vh;
}

/* ---------- header ---------- */
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(14px);
  background: rgba(255, 255, 255, 0.72);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

html.dark .site-header {
  background: rgba(18, 20, 27, 0.72);
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.header-inner {
  max-width: 1120px;
  height: 64px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-text strong {
  font-size: 15px;
}

.brand-text small {
  font-size: 11px;
  color: var(--text-tertiary);
}

.site-nav {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-left: 8px;
}

.site-nav a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.site-nav a:hover {
  color: #4c8bf5;
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.lang-label {
  font-size: 13px;
}

.user-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- main / footer ---------- */
.page-main {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px 32px;
}

.site-footer {
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 24px 40px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

html.dark .site-footer {
  border-top-color: rgba(255, 255, 255, 0.08);
}

/* ---------- responsive ---------- */
@media (max-width: 767px) {
  .header-inner {
    gap: 12px;
    padding: 0 16px;
  }

  .site-nav {
    display: none;
  }

  .brand-text small,
  .lang-label,
  .user-name {
    display: none;
  }

  /* 隐藏文字后两个图标按钮统一为等大方块，保证间距一致 */
  .header-actions {
    gap: 8px;
  }

  .header-actions .icon-btn {
    flex: none;
    width: 32px;
    height: 32px;
    padding: 0;
    justify-content: center;
  }

  .site-footer {
    flex-direction: column;
  }
}
</style>
