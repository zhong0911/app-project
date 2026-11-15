<script setup>
// 首页内容：header / footer 与页面宽度由 LandingLayout 提供
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  CodeOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  DeploymentUnitOutlined,
  ApiOutlined,
  SettingOutlined,
  BgColorsOutlined,
  SafetyCertificateOutlined,
  LoginOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  FolderOutlined,
  TeamOutlined,
} from '@antdv-next/icons'
import AppIcon from '@/components/AppIcon.vue'
import { useUserStore } from '@/stores/modules/user'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

// 首屏关键指标：value 为数字/短语，label 走 i18n
const stats = [
  { value: '7', labelKey: 'home.stats.backends' },
  { value: 'SSO', labelKey: 'home.stats.sso' },
  { value: '2', labelKey: 'home.stats.layouts' },
  { value: '100%', labelKey: 'home.stats.lazy' },
]

// 项目能力介绍
const features = [
  {
    icon: DeploymentUnitOutlined,
    titleKey: 'home.feature.multiBackendTitle',
    descKey: 'home.feature.multiBackendDesc',
  },
  {
    icon: SafetyCertificateOutlined,
    titleKey: 'home.feature.ssoTitle',
    descKey: 'home.feature.ssoDesc',
  },
  {
    icon: TeamOutlined,
    titleKey: 'home.feature.adminTitle',
    descKey: 'home.feature.adminDesc',
  },
  {
    icon: BgColorsOutlined,
    titleKey: 'home.feature.themeTitle',
    descKey: 'home.feature.themeDesc',
  },
]

const introPoints = [
  'home.intro.point1',
  'home.intro.point2',
  'home.intro.point3',
  'home.intro.point4',
]

// 技术栈介绍
const techStack = [
  { name: 'Vue 3', tagKey: 'home.tech.vueTag', icon: CodeOutlined, descKey: 'home.tech.vueDesc' },
  { name: 'Vite', tagKey: 'home.tech.viteTag', icon: ThunderboltOutlined, descKey: 'home.tech.viteDesc' },
  { name: 'Pinia', tagKey: 'home.tech.piniaTag', icon: AppstoreOutlined, descKey: 'home.tech.piniaDesc' },
  { name: 'Vue Router', tagKey: 'home.tech.routerTag', icon: DeploymentUnitOutlined, descKey: 'home.tech.routerDesc' },
  { name: 'Axios', tagKey: 'home.tech.axiosTag', icon: ApiOutlined, descKey: 'home.tech.axiosDesc' },
  { name: 'AntdvNext', tagKey: 'home.tech.antdTag', icon: SettingOutlined, descKey: 'home.tech.antdDesc' },
  { name: 'vue-i18n', tagKey: 'home.tech.i18nTag', icon: BgColorsOutlined, descKey: 'home.tech.i18nDesc' },
  { name: 'SSO / OAuth2', tagKey: 'home.tech.ssoTag', icon: SafetyCertificateOutlined, descKey: 'home.tech.ssoDesc' },
]

// 使用步骤
const steps = [
  { titleKey: 'home.usage.step1Title', descKey: 'home.usage.step1Desc' },
  { titleKey: 'home.usage.step2Title', descKey: 'home.usage.step2Desc' },
  { titleKey: 'home.usage.step3Title', descKey: 'home.usage.step3Desc' },
  { titleKey: 'home.usage.step4Title', descKey: 'home.usage.step4Desc' },
]

// 目录说明
const directories = [
  { path: 'src/api', descKey: 'home.dir.api' },
  { path: 'src/layouts', descKey: 'home.dir.layouts' },
  { path: 'src/views', descKey: 'home.dir.views' },
  { path: 'src/router', descKey: 'home.dir.router' },
  { path: 'src/stores', descKey: 'home.dir.stores' },
  { path: 'src/config', descKey: 'home.dir.config' },
]

function goLogin() {
  router.push({ path: '/login', query: { redirect_uri: '/' } })
}
</script>

<template>
  <div class="home-content">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-logo"><AppIcon :size="64" /></div>
        <a-tag color="blue" class="hero-badge">{{ t('home.badge') }}</a-tag>
        <h1 class="hero-title">
          {{ t('home.titlePrefix') }}
          <span class="gradient-text">{{ t('home.titleHighlight') }}</span>
        </h1>
        <p class="hero-desc">{{ t('home.desc') }}</p>
        <div class="hero-actions">
          <a-button type="primary" size="large" @click="$router.push('/components')">
            {{ t('home.browse') }}
            <ArrowRightOutlined />
          </a-button>
          <a-button size="large" @click="$router.push('/admin/users')" v-if="userStore.isAdmin">
            <SettingOutlined />
            {{ t('home.adminPanel') }}
          </a-button>
          <a-button v-else size="large" @click="goLogin">
            <LoginOutlined />
            {{ t('home.ssoLogin') }}
          </a-button>
        </div>
        <div class="hero-tags">
          <span v-for="item in techStack.slice(0, 5)" :key="item.name">{{ item.name }}</span>
        </div>
        <div class="hero-stats">
          <div v-for="item in stats" :key="item.labelKey" class="hero-stat">
            <strong>{{ item.value }}</strong>
            <span>{{ t(item.labelKey) }}</span>
          </div>
        </div>
      </section>

      <!-- 项目介绍 -->
      <section id="intro" class="section intro-section">
        <div class="intro-grid">
          <div class="intro-copy">
            <a-tag color="blue">{{ t('home.intro.tag') }}</a-tag>
            <h2>{{ t('home.intro.titleLine1') }}<br />{{ t('home.intro.titleLine2') }}</h2>
            <p>{{ t('home.intro.p1') }}</p>
            <p>{{ t('home.intro.p2') }}</p>
            <ul class="intro-points">
              <li v-for="point in introPoints" :key="point">
                <CheckCircleOutlined />
                <span>{{ t(point) }}</span>
              </li>
            </ul>
          </div>
          <div class="feature-grid">
            <div v-for="item in features" :key="item.titleKey" class="feature-card">
              <span class="feature-icon"><component :is="item.icon" /></span>
              <h3>{{ t(item.titleKey) }}</h3>
              <p>{{ t(item.descKey) }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 技术栈 -->
      <section id="stack" class="section">
        <div class="section-head">
          <h2>{{ t('home.tech.title') }}</h2>
          <p>{{ t('home.tech.subtitle') }}</p>
        </div>
        <div class="stack-grid">
          <div v-for="item in techStack" :key="item.name" class="stack-card">
            <div class="stack-icon"><component :is="item.icon" /></div>
            <div class="stack-body">
              <div class="stack-title">
                <strong>{{ item.name }}</strong>
                <a-tag>{{ t(item.tagKey) }}</a-tag>
              </div>
              <p>{{ t(item.descKey) }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 使用指南 -->
      <section id="usage" class="section">
        <div class="section-head">
          <h2>{{ t('home.usage.title') }}</h2>
          <p>{{ t('home.usage.subtitle') }}</p>
        </div>
        <div class="usage-grid">
          <div v-for="(step, index) in steps" :key="step.titleKey" class="step-card">
            <span class="step-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <strong>{{ t(step.titleKey) }}</strong>
            <p>{{ t(step.descKey) }}</p>
          </div>
        </div>

        <div class="code-panel">
          <div class="code-head">
            <span>{{ t('home.usage.terminal') }}</span>
            <span class="code-dots"><i /><i /><i /></span>
          </div>
          <pre><code># 安装依赖
npm install

# 本地开发
npm run dev

# 生产构建
npm run build</code></pre>
        </div>

        <div class="tips-grid">
          <div class="tip-card">
            <CheckCircleOutlined class="tip-icon" />
            <div>
              <strong>{{ t('home.usage.envTitle') }}</strong>
              <p>{{ t('home.usage.envDesc') }}</p>
            </div>
          </div>
          <div class="tip-card">
            <SafetyCertificateOutlined class="tip-icon" />
            <div>
              <strong>{{ t('home.usage.ssoTitle') }}</strong>
              <p>{{ t('home.usage.ssoDesc') }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 目录结构 -->
      <section id="structure" class="section">
        <div class="section-head">
          <h2>{{ t('home.dir.title') }}</h2>
          <p>{{ t('home.dir.subtitle') }}</p>
        </div>
        <div class="dir-grid">
          <div v-for="item in directories" :key="item.path" class="dir-item">
            <FolderOutlined class="dir-icon" />
            <div>
              <code>{{ item.path }}</code>
              <p>{{ t(item.descKey) }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 管理后台入口 -->
      <section class="section">
        <div class="admin-callout">
          <div>
            <h3>{{ t('home.adminCallout.title') }}</h3>
            <p>{{ t('home.adminCallout.desc') }}</p>
          </div>
          <a-button type="primary" @click="$router.push(userStore.isAdmin ? '/admin/users' : '/login')">
            {{ userStore.isAdmin ? t('home.adminCallout.enter') : t('home.adminCallout.login') }}
            <ArrowRightOutlined />
          </a-button>
        </div>
      </section>
  </div>
</template>

<style scoped>
/* ---------- hero ---------- */
.hero {
  position: relative;
  padding: 72px 0 56px;
  text-align: center;
  border-radius: 24px;
  background: radial-gradient(60% 75% at 50% 0%, rgba(76, 139, 245, 0.16), transparent 72%);
}

.hero-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.hero-badge {
  margin-bottom: 18px;
}

.hero-title {
  margin: 0;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.gradient-text {
  background: linear-gradient(135deg, #4c8bf5, #7b5bf5 55%, #38bdf8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-desc {
  max-width: 640px;
  margin: 20px auto 0;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.8;
}

.hero-actions {
  margin-top: 28px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-tags {
  margin-top: 32px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.hero-tags span {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(76, 139, 245, 0.1);
}

.hero-stats {
  max-width: 720px;
  margin: 28px auto 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.hero-stat {
  padding: 14px 10px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.66);
}

html.dark .hero-stat {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.hero-stat strong {
  display: block;
  font-size: 22px;
  line-height: 1.2;
  color: #4c8bf5;
}

.hero-stat span {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* ---------- intro ---------- */
.intro-section {
  padding-top: 24px;
}

.intro-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 32px;
  align-items: center;
}

.intro-copy h2 {
  margin: 14px 0 16px;
  font-size: clamp(24px, 3vw, 32px);
  line-height: 1.35;
}

.intro-copy p {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-secondary);
}

.intro-points {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.intro-points li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.intro-points svg {
  flex: none;
  margin-top: 2px;
  color: #4c8bf5;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.feature-card {
  padding: 18px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.66);
}

html.dark .feature-card {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.feature-icon {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #4c8bf5;
  font-size: 18px;
  background: rgba(76, 139, 245, 0.12);
}

.feature-card h3 {
  margin: 12px 0 6px;
  font-size: 15px;
}

.feature-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

/* ---------- sections ---------- */
.section {
  padding: 32px 0;
  scroll-margin-top: 88px;
}

.section-head {
  margin-bottom: 20px;
}

.section-head h2 {
  margin: 0 0 6px;
  font-size: 24px;
}

.section-head p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

/* ---------- tech stack ---------- */
.stack-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stack-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

html.dark .stack-card {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.stack-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(76, 139, 245, 0.12);
}

.stack-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #4c8bf5;
  font-size: 18px;
  background: rgba(76, 139, 245, 0.12);
}

.stack-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stack-body p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

/* ---------- usage ---------- */
.usage-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.step-card {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.66);
}

html.dark .step-card {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.step-index {
  display: block;
  margin-bottom: 8px;
  font-size: 22px;
  font-weight: 700;
  color: #4c8bf5;
}

.step-card p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.code-panel {
  margin-top: 18px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #0f172a;
  color: #e2e8f0;
}

.code-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  font-size: 12px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.04);
}

.code-dots {
  display: inline-flex;
  gap: 6px;
}

.code-dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #475569;
}

.code-panel pre {
  margin: 0;
  padding: 16px 18px 20px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.8;
}

.tips-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.tip-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(76, 139, 245, 0.08);
}

.tip-icon {
  color: #4c8bf5;
  font-size: 18px;
  margin-top: 2px;
}

.tip-card p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

code {
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
  background: rgba(76, 139, 245, 0.12);
}

/* ---------- directory ---------- */
.dir-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.dir-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.66);
}

html.dark .dir-item {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.dir-icon {
  color: #4c8bf5;
  font-size: 18px;
  margin-top: 2px;
}

.dir-item p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ---------- admin callout ---------- */
.admin-callout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 28px;
  border-radius: 16px;
  border: 1px solid rgba(76, 139, 245, 0.2);
  background: linear-gradient(135deg, rgba(76, 139, 245, 0.12), rgba(123, 91, 245, 0.1));
}

.admin-callout h3 {
  margin: 0 0 6px;
  font-size: 18px;
}

.admin-callout p {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

/* ---------- responsive ---------- */
@media (max-width: 1023px) {
  .stack-grid,
  .usage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dir-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .intro-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

@media (max-width: 767px) {
  .hero {
    padding: 48px 0 32px;
  }

  .hero-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .stack-grid,
  .usage-grid,
  .tips-grid,
  .dir-grid {
    grid-template-columns: 1fr;
  }

  .admin-callout {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
