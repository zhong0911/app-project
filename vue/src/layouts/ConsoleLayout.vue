<script setup>
import { computed, h, nextTick, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useBreakpoint } from 'antdv-next'
import { LOCALES, currentLocale, localeKey, setLocale } from '@/config/locale'
import { ACCOUNT_CENTER_URL } from '@/config/app'
import { useAppStore } from '@/stores/modules/app'
import { useUserStore } from '@/stores/modules/user'
import { releaseDrawerScrollLock, restoreDrawerScrollLock } from '@/utils/scroll-lock'
import SideMenu from './SideMenu.vue'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  UserOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  SettingOutlined,
  TeamOutlined,
  SafetyOutlined,
  DeleteOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
} from '@antdv-next/icons'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const { t } = useI18n()

// 响应式断点：md 以下（<768px）视为移动端
// 首帧默认按桌面渲染（defaultScreens），订阅后立即按真实宽度更新
const screens = useBreakpoint(true, { md: true, lg: true, xl: true })
const isMobile = computed(() => !screens.value?.md)

// 移动端菜单抽屉
const drawerOpen = ref(false)

// 抽屉开合时同步 body 滚动锁：antdv-next 关闭后锁可能残留，会让页面滚不动
watch(drawerOpen, (open) => {
  if (open) {
    restoreDrawerScrollLock()
    return
  }
  nextTick(releaseDrawerScrollLock)
})

// 菜单数据：管理后台（/admin）显示后台 tabs；业务区放模板示例页
const isAdminArea = computed(() => route.path.startsWith('/admin'))
const menuItems = computed(() => {
  if (isAdminArea.value) {
    return [
      { key: '/admin/users', label: t('nav.adminUsers'), icon: TeamOutlined },
      { key: '/admin/roles', label: t('nav.adminRoles'), icon: SafetyOutlined },
      { key: '/admin/recycle', label: t('nav.adminRecycle'), icon: DeleteOutlined },
    ]
  }
  // 业务区：模板自带的示例页；首页入口由侧边栏 logo（图标 + 标题）承担
  const items = [
    { key: '/', label: t('nav.home'), icon: HomeOutlined },
    { key: '/about', label: t('nav.about'), icon: InfoCircleOutlined },
    { key: '/components', label: t('nav.components'), icon: AppstoreOutlined },
  ]
  if (userStore.isAdmin) {
    items.push({ key: '/admin/users', label: t('common.adminPanel'), icon: SettingOutlined })
  }
  return items
})

function handleLocaleChange({ key }) {
  setLocale(key)
}

/** 语言下拉项：每一项前面带对应国旗（下拉 teleport 出去，样式用行内兜底） */
const localeMenuItems = computed(() => LOCALES.map((l) => ({
  key: l.key,
  label: h('span', { style: 'display:inline-flex;align-items:center;gap:8px' }, [
    h('img', {
      src: l.flag,
      alt: '',
      style: 'width:18px;height:12px;object-fit:cover;display:block;border-radius:2px',
    }),
    h('span', null, l.label),
  ]),
})))

const selectedKeys = computed(() => [route.path])

// 当前页面对应的菜单标题（显示在顶栏左侧）
const currentMenuTitle = computed(() => menuItems.value.find((m) => m.key === route.path)?.label || '')

function handleMenuClick({ key }) {
  router.push(key)
  // 移动端：选中后关闭抽屉
  if (isMobile.value) {
    drawerOpen.value = false
  }
}

// 退出登录：进入 /logout 页，由该页请求后端单点退出并跳转
function handleLogout() {
  router.push('/logout')
}

// 登录后用户菜单：账号中心（跳 SSO 账号中心）+ 退出登录
// 登录后用户菜单：管理员多一个「管理后台」入口；账号中心（跳 SSO 账号中心）+ 退出登录
const userMenuItems = computed(() => {
  const items = []
  if (userStore.isAdmin) {
    items.push({ key: 'admin', label: t('common.adminPanel'), icon: SettingOutlined })
  }
  items.push(
    { key: 'account', label: t('common.accountCenter'), icon: UserOutlined },
    { key: 'logout', label: t('common.logout'), icon: LogoutOutlined },
  )
  return items
})

function handleUserMenu({ key }) {
  if (key === 'admin') {
    // 后台入口（仅管理员可见）：/admin 默认重定向到用户管理
    router.push('/admin')
    return
  }
  if (key === 'account') {
    // 账号中心在 SSO（passport.antx.cc）侧，新标签打开，避免把当前页面带离前端
    window.open(ACCOUNT_CENTER_URL, '_blank', 'noopener')
    return
  }
  handleLogout()
}

// 进入应用时拉取 SSO 登录态（会话 Cookie 由后端维护；未登录静默忽略）
// 若存在 /login?redirect_uri 暂存的回跳地址且已登录，登录后跳转该地址
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
        @logo-click="drawerOpen = false"
      />
    </a-drawer>

    <a-layout
      class="layout-main"
      :style="{ marginLeft: isMobile ? 0 : appStore.collapsed ? '80px' : '220px' }"
    >
      <!-- 顶栏 -->
      <a-layout-header class="header" :style="{ height: '52px', lineHeight: 'normal' }">
        <div class="header-left">
          <!-- 移动端：菜单按钮打开抽屉；桌面端：折叠/展开 -->
          <component
            :is="isMobile ? MenuOutlined : appStore.collapsed ? MenuUnfoldOutlined : MenuFoldOutlined"
            class="trigger"
            @click="isMobile ? (drawerOpen = true) : appStore.toggleCollapsed()"
          />
          <!-- 当前页面标题（对应左侧菜单） -->
          <span v-if="currentMenuTitle" class="page-title">{{ currentMenuTitle }}</span>
        </div>
        <div class="header-right">
          <!-- 语言切换：按钮显示当前国旗 + 语言名，下拉每一项也带国旗 -->
          <a-dropdown
            :trigger="['click']"
            :menu="{
              items: localeMenuItems,
              selectable: true,
              selectedKeys: [localeKey],
            }"
            @menu-click="handleLocaleChange"
          >
            <a-button size="small" type="text" class="lang-btn">
              <img class="lang-flag" :src="currentLocale.flag" alt="" />
              <span class="lang-text">{{ currentLocale.label }}</span>
            </a-button>
          </a-dropdown>
          <a-button size="small" type="text" shape="circle" class="theme-btn" @click="appStore.toggleDark()">
            <component :is="appStore.isDark ? SunOutlined : MoonOutlined" />
          </a-button>
          <!-- 用户菜单：未登录显示登录入口（跳转 /login 页）；
               登录态探测完成前只留等宽占位，避免先闪一下登录按钮 -->
          <template v-if="userStore.loginChecked">
            <a-button
              v-if="!userStore.isLoggedIn"
              size="small"
              type="primary"
              @click="router.push('/login')"
            >
              {{ t('common.login') }}
            </a-button>
            <a-dropdown
              v-else
              :trigger="['click']"
              :menu="{ items: userMenuItems }"
              @menu-click="handleUserMenu"
            >
              <a-button size="small" type="text" shape="circle" class="user-btn">
                <UserOutlined />
              </a-button>
            </a-dropdown>
          </template>
          <span v-else class="auth-slot" aria-hidden="true" />
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
  min-height: 100svh;
}

/* 侧边栏：fixed 固定不滚动，高度撑满视口；背景由 :theme + Layout token 控制 */
.layout-sider {
  position: fixed !important;
  top: 0;
  left: 0;
  bottom: 0;
  height: 100svh;
  overflow-y: auto;
  z-index: 100;
}

/* 主区域：左移侧边栏宽度（折叠 80 / 展开 220，由 JS 绑定） */
.layout-main {
  min-height: 100svh;
  transition: margin-left 0.2s;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 16px;
}

.trigger {
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s;
  /* 与顶栏左边缘留出一点呼吸感，避免贴边 */
  margin-left: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 当前页面标题（对应左侧菜单），顶栏靠左显示 */
.page-title {
  font-size: 16px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.lang-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 6px;
}

.lang-flag {
  width: 18px;
  height: 12px;
  object-fit: cover;
  display: block;
  border-radius: 2px;
}

.lang-text {
  font-size: 13px;
  line-height: 1;
}

/* 主题切换按钮（图标尺寸对齐原 trigger） */
.theme-btn {
  display: inline-flex;
  align-items: center;
  font-size: 16px;
}

/* 用户菜单按钮：与语言 / 主题按钮同为 text 类型圆形图标按钮（不显示用户名） */
.user-btn {
  flex: none;
  width: 32px;
  height: 32px;
  padding: 0;
}

/* 登录态探测中的占位：与「登录」按钮同宽，避免探测完成后按钮出现时布局跳动 */
.auth-slot {
  display: inline-block;
  width: 56px;
  height: 24px;
}

/* 内容区：透明背景露出 layout 底色（colorBgLayout），
   内部 a-card/表格等容器用 colorBgContainer 自然浮出层次 */
.content {
  margin: 16px;
  padding: 24px;
  min-height: calc(100svh - 64px - 32px);
}

/* 路由懒加载 loading：wrapper 撑满内容区高度，antdv spinner 默认在容器内居中；
   注意不要用 flex，否则页面内容也会被居中 */
.route-spin {
  min-height: calc(100svh - 64px - 96px);
}

/* ============ 移动端适配（<768px） ============ */
@media (max-width: 767px) {
  .header {
    padding: 0 8px;
  }

  .header-right {
    gap: 8px;
  }

  /* 隐藏语言文字后图标按钮统一为等大方块，保证间距一致 */
  .lang-btn {
    flex: none;
    width: 32px;
    height: 32px;
    padding: 0;
    justify-content: center;
  }

  .user-btn {
    flex: none;
    width: 32px;
    height: 32px;
    padding: 0;
    justify-content: center;
  }

  .content {
    margin: 8px;
    padding: 12px;
    min-height: calc(100svh - 64px - 16px);
  }
}
</style>
