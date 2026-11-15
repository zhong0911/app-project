<script setup>
// 落地页布局（LandingLayout）：顶部 header + 内容插槽 + 页脚，无侧边菜单
// 用于首页等对外展示页面；后台/示例页面使用 ConsoleLayout
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useBreakpoint } from 'antdv-next'
import {
  GlobalOutlined,
  SunOutlined,
  MoonOutlined,
  LoginOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@antdv-next/icons'
import AppIcon from '@/components/AppIcon.vue'
import SideMenu from './SideMenu.vue'
import { LOCALES, localeKey, setLocale } from '@/config/locale'
import { useAppStore } from '@/stores/modules/app'
import { useUserStore } from '@/stores/modules/user'
import { toggleTheme } from '@/utils/app'
import { releaseDrawerScrollLock, restoreDrawerScrollLock } from '@/utils/scroll-lock'
import { ACCOUNT_CENTER_URL, APP_TITLE } from '@/config/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const { t } = useI18n()

// 响应式断点：md 以下（<768px）视为移动端，导航折叠进左侧抽屉
// 首帧默认按桌面渲染（defaultScreens），订阅后立即按真实宽度更新
const screens = useBreakpoint(true, { md: true })
const isMobile = computed(() => !screens.value?.md)

// 移动端导航抽屉
const drawerOpen = ref(false)

// 抽屉开合时同步 body 滚动锁：antdv-next 关闭后锁可能残留，会让页面滚不动
watch(drawerOpen, (open) => {
  if (open) {
    restoreDrawerScrollLock()
    return
  }
  nextTick(releaseDrawerScrollLock)
})

// 抽屉里的导航项：锚点回首页对应区块，组件预览走路由
const drawerItems = computed(() => [
  { key: '/#intro', label: t('nav.intro') },
  { key: '/#stack', label: t('nav.stack') },
  { key: '/#usage', label: t('nav.usage') },
  { key: '/#structure', label: t('nav.structure') },
  { key: '/components', label: t('nav.components') },
])

// 桌面导航的锚点项：统一走 scrollToSection，原生 href 跳转会把标题顶到 sticky 顶栏后面
const anchorNav = [
  { hash: '#intro', labelKey: 'nav.intro' },
  { hash: '#stack', labelKey: 'nav.stack' },
  { hash: '#usage', labelKey: 'nav.usage' },
  { hash: '#structure', labelKey: 'nav.structure' },
]

// 抽屉内导航：锚点项先回首页再滚到区块；组件预览等路由项直接跳
function handleDrawerMenu({ key }) {
  drawerOpen.value = false
  if (key.startsWith('/#')) {
    const hash = key.slice(1)
    if (route.path !== '/') {
      router.push('/')
    }
    // 抽屉关闭会锁 body 滚动，先解除再滚，否则平滑动画会被打断
    nextTick(() => {
      releaseDrawerScrollLock()
      scrollToSection(hash)
    })
    return
  }
  router.push(key)
}

/**
 * 滚动到区块：顶栏是 sticky（高 64px），scrollIntoView 会把标题顶到栏后面，
 * 所以按元素位置手算偏移，命中即平滑滚动（与抽屉菜单同一套手感）。
 * Home 是懒加载组件，元素可能稍后才挂载，用 rAF 逐帧重试。
 * 平滑动画依赖渲染帧，页面切到后台时不会推进，所以补一次即时滚动兜底。
 */
function scrollToSection(hash, smooth = true, frames = 60) {
  const el = document.querySelector(hash)
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 64
    window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
    if (smooth) {
      setTimeout(() => {
        if (Math.abs(window.scrollY - top) > 2) {
          window.scrollTo({ top })
        }
      }, 400)
    }
    return
  }
  if (frames > 0) {
    requestAnimationFrame(() => scrollToSection(hash, smooth, frames - 1))
  }
}

// 抽屉里的 logo 点击：关闭抽屉并回首页；已经停在首页时路由不会变化，手动回到顶部
function handleLogoClick() {
  drawerOpen.value = false
  if (route.path === '/') {
    window.scrollTo({ top: 0 })
  }
}

// 移动端：点品牌图标/标题打开导航抽屉（阻止默认的「回首页」跳转）
function handleBrandClick(event) {
  if (!isMobile.value) {
    return
  }
  event.preventDefault()
  drawerOpen.value = true
}

const userMenuItems = computed(() => [
  { key: 'account', label: t('common.accountCenter'), icon: UserOutlined },
  { key: 'logout', label: t('common.logout'), icon: LogoutOutlined },
])

function handleLocaleChange({ key }) {
  setLocale(key)
}

function handleUserMenu({ key }) {
  if (key === 'account') {
    // 账号中心在 SSO（passport.antx.cc）侧，新标签打开，避免把当前页面带离前端
    window.open(ACCOUNT_CENTER_URL, '_blank', 'noopener')
  } else if (key === 'logout') {
    router.push('/logout')
  }
}

function goLogin() {
  // 已经在首页时不需要回跳参数，避免登录页出现 ?redirect_uri=/ 这种无意义参数
  if (route.path === '/' && !route.hash) {
    router.push('/login')
    return
  }
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
        <!-- 品牌区：桌面端点击回首页；移动端导航折叠进左侧抽屉，点图标/标题即打开抽屉 -->
        <router-link
          to="/"
          class="brand"
          :class="{ 'brand-trigger': isMobile }"
          :aria-label="isMobile ? t('common.menu') : undefined"
          @click="handleBrandClick"
        >
          <AppIcon :size="36" />
          <span class="brand-text">
            <strong>{{ APP_TITLE }}</strong>
            <small>{{ t('landing.brandSubtitle') }}</small>
          </span>
        </router-link>

        <!-- 桌面导航：锚点走平滑滚动（与抽屉菜单同一套滚动逻辑，含 sticky 顶栏偏移） -->
        <nav class="site-nav">
          <a
            v-for="item in anchorNav"
            :key="item.hash"
            :href="item.hash"
            @click.prevent="scrollToSection(item.hash)"
          >{{ t(item.labelKey) }}</a>
          <router-link to="/components">{{ t('nav.components') }}</router-link>
        </nav>

        <div class="header-actions">
          <!-- 语言切换：与主题按钮同款的圆形图标按钮，不显示当前语言文字 -->
          <a-dropdown
            :trigger="['click']"
            :menu="{
              items: LOCALES.map((l) => ({ key: l.key, label: l.label })),
              selectable: true,
              selectedKeys: [localeKey],
            }"
            @menu-click="handleLocaleChange"
          >
            <a-button type="text" shape="circle" class="icon-btn">
              <GlobalOutlined />
            </a-button>
          </a-dropdown>

          <!-- 主题切换 -->
          <a-button type="text" shape="circle" class="icon-btn" @click="toggleTheme">
            <component :is="appStore.isDark ? SunOutlined : MoonOutlined" />
          </a-button>

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
            <a-button type="text" shape="circle" class="icon-btn">
              <UserOutlined />
            </a-button>
          </a-dropdown>
        </div>
      </div>
    </header>

    <!-- 移动端导航抽屉：与 ConsoleLayout 同一套 SideMenu（logo 图标 + 标题 + 菜单），
         logo 点击返回首页，背景跟随主题 token -->
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
        :menus="drawerItems"
        @menu-click="handleDrawerMenu"
        @logo-click="handleLogoClick"
      />
    </a-drawer>

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
  min-height: 100svh;
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

/* 品牌区：标题可能很长（读 APP_TITLE），允许收缩 + 省略号，不把右侧按钮挤出屏幕 */
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.brand > :first-child {
  flex: none;
}

.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  line-height: 1.2;
}

.brand-text strong,
.brand-text small {
  display: block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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
  flex: none;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 移动端品牌区即菜单入口：整块可点（图标 + 标题） */
.brand-trigger {
  cursor: pointer;
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

  .brand-text small {
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
