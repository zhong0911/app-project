<script setup>
/**
 * 极简布局：给图床首页用 —— 没有侧边菜单、没有抽屉菜单，
 * 只有一条顶栏（品牌 + 语言 / 主题 / 用户），管理员额外看到一个控制台入口。
 * 管理后台（/admin）仍然走 ConsoleLayout，那里才有左侧菜单。
 */
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LOCALES, localeKey, setLocale } from '@/config/locale'
import { ACCOUNT_CENTER_URL, APP_TITLE } from '@/config/app'
import { useAppStore } from '@/stores/modules/app'
import { useUserStore } from '@/stores/modules/user'
import {
  DashboardOutlined,
  GlobalOutlined,
  LogoutOutlined,
  MoonOutlined,
  PictureOutlined,
  SunOutlined,
  UserOutlined,
} from '@antdv-next/icons'

const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const { t } = useI18n()

const userMenuItems = computed(() => [
  { key: 'account', label: t('common.accountCenter'), icon: UserOutlined },
  { key: 'logout', label: t('common.logout'), icon: LogoutOutlined },
])

const handleLocaleChange = ({ key }) => setLocale(key)

const handleUserMenu = ({ key }) => {
  if (key === 'account') {
    // 账号中心在 SSO（passport.antx.cc）侧，新标签打开
    window.open(ACCOUNT_CENTER_URL, '_blank', 'noopener')
    return
  }
  router.push('/logout')
}

// 控制台入口：只有管理员可见（isAdmin 由后端按 SSO_ADMIN_UID 判定并下发）
const goConsole = () => router.push('/admin/users')

onMounted(async () => {
  await userStore.fetchLoginUser()
  // 从 SSO 授权页回来后恢复回跳（地址存 localStorage，带 30 分钟过期）
  const redirect = userStore.readRedirectUri()
  if (redirect && userStore.isLoggedIn) {
    userStore.clearRedirectUri()
    userStore.markLoggedIn()
    router.replace(redirect)
  }
})
</script>

<template>
  <a-layout class="simple-root">
    <a-layout-header class="simple-header">
      <div class="brand" @click="router.push('/image-bed')">
        <PictureOutlined class="brand-icon" />
        <span class="brand-title">{{ APP_TITLE }}</span>
      </div>

      <div class="actions">
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
          <a-button size="small" type="text" shape="circle" class="icon-btn">
            <GlobalOutlined />
          </a-button>
        </a-dropdown>

        <!-- 主题切换 -->
        <a-button size="small" type="text" shape="circle" class="icon-btn" @click="appStore.toggleDark()">
          <component :is="appStore.isDark ? SunOutlined : MoonOutlined" />
        </a-button>

        <!-- 控制台：仅管理员显示 -->
        <a-tooltip v-if="userStore.isAdmin" :title="t('common.console')">
          <a-button size="small" type="text" shape="circle" class="icon-btn console-btn" @click="goConsole">
            <DashboardOutlined />
          </a-button>
        </a-tooltip>

        <!-- 用户：未登录给登录入口，已登录给账号中心 / 退出 -->
        <a-button v-if="!userStore.isLoggedIn" size="small" type="primary" @click="router.push('/login')">
          {{ t('common.login') }}
        </a-button>
        <a-dropdown v-else :trigger="['click']" :menu="{ items: userMenuItems }" @menu-click="handleUserMenu">
          <a-button size="small" type="text" shape="circle" class="icon-btn">
            <UserOutlined />
          </a-button>
        </a-dropdown>
      </div>
    </a-layout-header>

    <a-layout-content class="simple-content">
      <router-view v-slot="{ Component }">
        <a-spin :spinning="!Component" :classes="{ root: 'route-spin' }">
          <component :is="Component" />
        </a-spin>
      </router-view>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>
/* 只用结构属性，配色交给 antdv-next 的 Layout / Button token */
.simple-root {
  min-height: 100svh;
}

.simple-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.brand-icon {
  font-size: 20px;
}

.brand-title {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 图标按钮统一等大方块，保证间距一致 */
.icon-btn {
  flex: none;
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.simple-content {
  margin: 16px;
  padding: 24px;
  min-height: calc(100svh - 64px - 32px);
}

/* 路由懒加载 loading：wrapper 撑满内容区，spinner 默认居中 */
.route-spin {
  min-height: calc(100svh - 64px - 96px);
}

@media (max-width: 767px) {
  .simple-header {
    padding: 0 8px;
  }

  .actions {
    gap: 4px;
  }

  .brand-title {
    font-size: 15px;
  }

  .simple-content {
    margin: 8px;
    padding: 12px;
    min-height: calc(100svh - 64px - 16px);
  }
}
</style>
