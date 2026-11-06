<script setup>
// 首页：PaaS 产品落地页，布局（header/footer/宽度）由 LandingLayout 提供
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowRightOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DeploymentUnitOutlined,
  HistoryOutlined,
  LineChartOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@antdv-next/icons'
import AppIcon from '@/components/AppIcon.vue'
import { useUserStore } from '@/stores/modules/user'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const highlights = [
  { icon: CodeOutlined, key: 'git' },
  { icon: CloudServerOutlined, key: 'docker' },
  { icon: ThunderboltOutlined, key: 'live' },
  { icon: HistoryOutlined, key: 'rollback' },
]

const features = [
  { icon: CodeOutlined, key: 'source' },
  { icon: DeploymentUnitOutlined, key: 'build' },
  { icon: CloudServerOutlined, key: 'runtime' },
  { icon: LineChartOutlined, key: 'metrics' },
  { icon: SettingOutlined, key: 'env' },
  { icon: SafetyCertificateOutlined, key: 'secure' },
]

const steps = [
  { key: 'connect', index: '01' },
  { key: 'build', index: '02' },
  { key: 'release', index: '03' },
]

function enterConsole() {
  if (userStore.isLoggedIn) {
    router.push('/overview')
  } else {
    router.push({ path: '/login', query: { redirect_uri: '/overview' } })
  }
}

onMounted(async () => {
  await userStore.fetchLoginUser()
})
</script>

<template>
  <div class="landing-page">
    <section class="hero">
      <div class="hero-content">
        <a-tag class="hero-badge" color="blue">AntX PaaS · {{ t('paasLanding.badge') }}</a-tag>
        <h1 class="hero-title">
          {{ t('paasLanding.title') }}
          <span class="hero-highlight">{{ t('paasLanding.titleHighlight') }}</span>
        </h1>
        <p class="hero-desc">{{ t('paasLanding.desc') }}</p>
        <div class="hero-actions">
          <a-button type="primary" size="large" @click="enterConsole">
            <RocketOutlined />
            {{ userStore.isLoggedIn ? t('paasLanding.ctaConsole') : t('common.login') }}
            <ArrowRightOutlined />
          </a-button>
          <a-button size="large" @click="router.push('/about')">{{ t('paasLanding.ctaAbout') }}</a-button>
        </div>
        <div class="hero-highlights">
          <div v-for="item in highlights" :key="item.key" class="highlight">
            <component :is="item.icon" class="highlight-icon" />
            <span>{{ t(`paasLanding.highlights.${item.key}`) }}</span>
          </div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="terminal-card">
          <div class="terminal-bar">
            <span class="dot red" /><span class="dot yellow" /><span class="dot green" />
            <span class="terminal-title">deploy.yml</span>
          </div>
          <pre class="terminal-body"><span class="c"># 连接仓库，平台自动构建镜像</span>
<span class="k">app</span>: marketing-site
<span class="k">repo</span>: gitee.com/antx/site
<span class="k">branch</span>: main
<span class="k">port</span>: 80

<span class="c"># 一条命令发布到容器运行时</span>
<span class="ok">✓</span> build image antx-paas/site:12
<span class="ok">✓</span> container running → :20000
<span class="ok">✓</span> health check passed</pre>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>{{ t('paasLanding.featuresTitle') }}</h2>
        <p>{{ t('paasLanding.featuresSubtitle') }}</p>
      </div>
      <div class="feature-grid">
        <a-card v-for="item in features" :key="item.key" variant="borderless" class="feature-card">
          <div class="feature-icon"><component :is="item.icon" /></div>
          <h3>{{ t(`paasLanding.features.${item.key}.title`) }}</h3>
          <p>{{ t(`paasLanding.features.${item.key}.desc`) }}</p>
        </a-card>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>{{ t('paasLanding.flowTitle') }}</h2>
        <p>{{ t('paasLanding.flowSubtitle') }}</p>
      </div>
      <div class="step-grid">
        <div v-for="step in steps" :key="step.key" class="step-card">
          <span class="step-index">{{ step.index }}</span>
          <h3>{{ t(`paasLanding.steps.${step.key}.title`) }}</h3>
          <p>{{ t(`paasLanding.steps.${step.key}.desc`) }}</p>
        </div>
      </div>
    </section>

    <section class="cta">
      <AppIcon :size="44" />
      <h2>{{ t('paasLanding.ctaTitle') }}</h2>
      <p>{{ t('paasLanding.ctaDesc') }}</p>
      <a-button type="primary" size="large" @click="enterConsole">
        <RocketOutlined />{{ t('paasLanding.ctaButton') }}
      </a-button>
    </section>
  </div>
</template>

<style scoped>
.landing-page {
  display: flex;
  flex-direction: column;
  gap: 64px;
  padding: 24px 0 48px;
}

.hero {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 48px;
  align-items: center;
  padding: 40px 0 8px;
}

.hero-badge {
  margin-bottom: 16px;
  border-radius: 999px;
  padding: 2px 12px;
}

.hero-title {
  font-size: 46px;
  line-height: 1.15;
  font-weight: 700;
  margin: 0 0 16px;
}

.hero-highlight {
  color: #4c8bf5;
}

.hero-desc {
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-secondary);
  max-width: 520px;
  margin-bottom: 28px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-highlights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 32px;
  max-width: 520px;
}

.highlight {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.highlight-icon {
  color: #4c8bf5;
  font-size: 16px;
}

.terminal-card {
  background: #0f1117;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(15, 17, 23, 0.24);
}

.terminal-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: #171a23;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.dot.red { background: #ff5f57; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }

.terminal-title {
  margin-left: 8px;
  font-size: 12px;
  color: #8b93a7;
}

.terminal-body {
  margin: 0;
  padding: 18px 20px 24px;
  color: #d6deeb;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  line-height: 1.85;
  overflow-x: auto;
}

.terminal-body .c { color: #6b7280; }
.terminal-body .k { color: #7f9cf5; }
.terminal-body .ok { color: #34d399; }

.section-head {
  margin-bottom: 24px;
}

.section-head h2 {
  font-size: 28px;
  margin: 0 0 8px;
}

.section-head p {
  color: var(--text-secondary);
  margin: 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.feature-card :deep(.ant-card-body) {
  padding: 22px;
}

.feature-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(76, 139, 245, 0.1);
  color: #4c8bf5;
  font-size: 18px;
  margin-bottom: 14px;
}

.feature-card h3 {
  font-size: 16px;
  margin: 0 0 8px;
}

.feature-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.step-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.step-card {
  position: relative;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(128, 128, 128, 0.16);
}

.step-index {
  font-size: 28px;
  font-weight: 700;
  color: rgba(76, 139, 245, 0.28);
  line-height: 1;
}

.step-card h3 {
  margin: 10px 0 8px;
  font-size: 17px;
}

.step-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.cta {
  text-align: center;
  padding: 48px 24px;
  border-radius: 16px;
  background: rgba(76, 139, 245, 0.07);
  border: 1px solid rgba(76, 139, 245, 0.16);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.cta h2 {
  margin: 4px 0 0;
  font-size: 26px;
}

.cta p {
  margin: 0 0 8px;
  color: var(--text-secondary);
}

@media (max-width: 1023px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .feature-grid,
  .step-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .landing-page {
    gap: 40px;
  }
  .hero-title {
    font-size: 32px;
  }
  .hero-desc {
    font-size: 14px;
  }
  .hero-highlights,
  .feature-grid,
  .step-grid {
    grid-template-columns: 1fr;
  }
  .cta h2 {
    font-size: 20px;
  }
}
</style>
