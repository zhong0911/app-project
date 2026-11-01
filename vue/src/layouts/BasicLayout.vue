<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBreakpoint } from 'antdv-next'
import { LOCALES, currentLocale, localeKey, setLocale } from '@/config/locale'
import { useAppStore } from '@/stores/modules/app'
import { useUserStore } from '@/stores/modules/user'
import SideMenu from './SideMenu.vue'
import {
  HomeOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  UserOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
} from '@antdv-next/icons'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

// 响应式断点：md 以下（<768px）视为移动端
// 首帧默认按桌面渲染（defaultScreens），订阅后立即按真实宽度更新
const screens = useBreakpoint(true, { md: true, lg: true, xl: true })
const isMobile = computed(() => !screens.value?.md)

// 移动端菜单抽屉
const drawerOpen = ref(false)

// 菜单数据：与路由 meta 对应（布局文案固定中文）
const menuItems = [
  { key: '/home', label: '首页', icon: HomeOutlined },
  { key: '/components', label: '组件预览', icon: AppstoreOutlined },
  { key: '/about', label: '关于', icon: InfoCircleOutlined },
]

// 当前语言显示名（响应式）
const currentLocaleLabel = computed(() => currentLocale.value.label)

function handleLocaleChange({ key }) {
  setLocale(key)
}

const selectedKeys = computed(() => [route.path])

function handleMenuClick({ key }) {
  router.push(key)
  // 移动端：选中后关闭抽屉
  if (isMobile.value) {
    drawerOpen.value = false
  }
}

async function handleLogout() {
  await userStore.logout()
  router.push('/home')
}

// 进入应用时拉取 SSO 登录态（会话 Cookie 由后端维护；未登录静默忽略）
onMounted(() => {
  userStore.fetchLoginUser()
})
</script>

<template>
  <a-layout class="layout-root">
    <!-- 桌面端侧边栏：fixed 固定，不随页面滚动；宽度随折叠状态变化；theme 跟随全局主题 -->
    <a-layout-sider
      v-if="!isMobile"
      v-model:collapsed="appStore.collapsed"
      collapsible
      :trigger="null"
      :width="220"
      :theme="appStore.isDark ? 'dark' : 'light'"
      class="layout-sider"
    >
      <SideMenu
        :theme="appStore.isDark ? 'dark' : 'light'"
        :menus="menuItems"
        :selected-keys="selectedKeys"
        :collapsed="appStore.collapsed"
        @menu-click="handleMenuClick"
      />
    </a-layout-sider>

    <!-- 移动端菜单抽屉 -->
    <a-drawer
      v-if="isMobile"
      v-model:open="drawerOpen"
      placement="left"
      :size="220"
      :closable="false"
      :styles="{ body: { padding: 0 } }"
    >
      <SideMenu
        :theme="appStore.isDark ? 'dark' : 'light'"
        :menus="menuItems"
        :selected-keys="selectedKeys"
        @menu-click="handleMenuClick"
      />
    </a-drawer>

    <a-layout
      class="layout-main"
      :style="{ marginLeft: isMobile ? 0 : appStore.collapsed ? '80px' : '220px' }"
    >
      <!-- 顶栏 -->
      <a-layout-header class="header">
        <div class="header-left">
          <!-- 移动端：菜单按钮打开抽屉；桌面端：折叠/展开 -->
          <component
            :is="isMobile ? MenuOutlined : appStore.collapsed ? MenuUnfoldOutlined : MenuFoldOutlined"
            class="trigger"
            @click="isMobile ? (drawerOpen = true) : appStore.toggleCollapsed()"
          />
        </div>
        <div class="header-right">
          <!-- 语言切换：走全局 locale 配置（config/locale.js） -->
          <a-dropdown
            :trigger="['click']"
            :menu="{
              items: LOCALES.map((l) => ({ key: l.key, label: l.label })),
              selectable: true,
              selectedKeys: [localeKey],
            }"
            @menu-click="handleLocaleChange"
          >
            <a-button size="small" type="text" class="lang-btn">
              <GlobalOutlined />
              <span v-if="!isMobile" class="lang-text">{{ currentLocaleLabel }}</span>
            </a-button>
          </a-dropdown>
          <a-tooltip :title="appStore.isDark ? '切换浅色' : '切换暗色'">
            <component
              :is="appStore.isDark ? SunOutlined : MoonOutlined"
              class="trigger"
              @click="appStore.toggleDark()"
            />
          </a-tooltip>
          <!-- 用户菜单：未登录显示 SSO 登录入口（OAuth2 客户端，跳转后端 /oauth2/sso/authorize） -->
          <a-button
            v-if="!userStore.isLoggedIn"
            size="small"
            type="primary"
            @click="userStore.loginWithSso()"
          >
            SSO 登录
          </a-button>
          <a-dropdown
            v-else
            :trigger="['click']"
            :menu="{ items: [{ key: 'logout', label: '退出登录', icon: LogoutOutlined }] }"
            @menu-click="handleLogout"
          >
            <span class="user-info">
              <UserOutlined />
              <span v-if="!isMobile" class="user-name">{{ userStore.displayName || '未登录' }}</span>
            </span>
          </a-dropdown>
        </div>
      </a-layout-header>

      <!-- 内容区：懒加载组件解析期间（Component 为 null）显示居中 a-spin，
           加载完成后正常渲染（不居中）。使用 slot 模式，无需 Suspense -->
      <a-layout-content class="content">
        <router-view v-slot="{ Component }">
          <a-spin :spinning="!Component" :classes="{ root: 'route-spin' }">
            <component :is="Component" />
          </a-spin>
        </router-view>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
/* 布局结构样式：配色一律交给 antdv-next 主题 token（Layout headerBg/siderBg、colorText 等），
   这里只保留定位、尺寸、间距等结构属性 */

/* 布局根：铺满视口 */
.layout-root {
  min-height: 100vh;
}

/* 侧边栏：fixed 固定不滚动，高度撑满视口；背景由 :theme + Layout token 控制 */
.layout-sider {
  position: fixed !important;
  top: 0;
  left: 0;
  bottom: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 100;
}

/* 主区域：左移侧边栏宽度（折叠 80 / 展开 220，由 JS 绑定） */
.layout-main {
  min-height: 100vh;
  transition: margin-left 0.2s;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.trigger {
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.lang-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.user-info {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 内容区：透明背景露出 layout 底色（colorBgLayout），
   内部 a-card/表格等容器用 colorBgContainer 自然浮出层次 */
.content {
  margin: 16px;
  padding: 24px;
  min-height: calc(100vh - 64px - 32px);
}

/* 路由懒加载 loading：wrapper 撑满内容区高度，antdv spinner 默认在容器内居中；
   注意不要用 flex，否则页面内容也会被居中 */
.route-spin {
  min-height: calc(100vh - 64px - 96px);
}

/* ============ 移动端适配（<768px） ============ */
@media (max-width: 767px) {
  .header {
    padding: 0 8px;
  }

  .header-right {
    gap: 8px;
  }

  .content {
    margin: 8px;
    padding: 12px;
    min-height: calc(100vh - 64px - 16px);
  }
}
</style>
