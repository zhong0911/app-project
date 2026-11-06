<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  ArrowRightOutlined,
} from '@antdv-next/icons'
import { getOverviewApi } from '@/api/paas'
import { formatTime, statusColor } from '@/utils/paas'

const router = useRouter()
const { t } = useI18n()

const loading = ref(true)
const data = ref(null)

const stats = computed(() => {
  const value = data.value?.stats || {}
  return [
    { key: 'apps', label: t('paas.overview.apps'), value: value.apps ?? 0, icon: AppstoreOutlined, suffix: '' },
    { key: 'running', label: t('paas.overview.running'), value: value.running ?? 0, icon: CheckCircleOutlined, suffix: '' },
    { key: 'deployments24h', label: t('paas.overview.deployments24h'), value: value.deployments24h ?? 0, icon: RocketOutlined, suffix: '' },
    { key: 'successRate', label: t('paas.overview.successRate'), value: value.successRate ?? 0, icon: ThunderboltOutlined, suffix: '%' },
  ]
})

const executor = computed(() => data.value?.executor || {})

async function load() {
  loading.value = true
  try {
    const { data: res } = await getOverviewApi()
    data.value = res
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="paas-page">
    <a-card variant="borderless" class="hero-card">
      <div class="hero">
        <div>
          <a-typography-title :level="4" class="hero-title">{{ t('paas.overview.title') }}</a-typography-title>
          <a-typography-paragraph class="hero-desc">{{ t('paas.overview.subtitle') }}</a-typography-paragraph>
          <a-space wrap>
            <a-tag :color="executor.type === 'docker' ? 'green' : 'orange'">
              {{ t('paas.overview.executor') }}: {{ executor.type }}
            </a-tag>
            <a-tag>{{ executor.target }}</a-tag>
            <a-tag v-if="executor.version">v{{ executor.version }}</a-tag>
          </a-space>
        </div>
        <a-button type="primary" size="large" @click="router.push('/apps')">
          <PlusOutlined />
          {{ t('paas.overview.newApp') }}
        </a-button>
      </div>
      <a-alert
        v-if="executor.fallback"
        class="fallback-alert"
        type="warning"
        show-icon
        :message="t('paas.overview.fallback', { reason: executor.reason || '' })"
      />
    </a-card>

    <a-spin :spinning="loading">
      <div class="stat-grid">
        <a-card v-for="item in stats" :key="item.key" variant="borderless" class="stat-card">
          <div class="stat-inner">
            <div class="stat-icon"><component :is="item.icon" /></div>
            <div>
              <div class="stat-value">{{ item.value }}<span class="stat-suffix">{{ item.suffix }}</span></div>
              <div class="stat-label">{{ item.label }}</div>
            </div>
          </div>
        </a-card>
      </div>

      <div class="content-grid">
        <a-card variant="borderless" :title="t('paas.overview.recentDeployments')">
          <template #extra>
            <a-button type="link" size="small" @click="router.push('/apps')">
              {{ t('paas.overview.viewAll') }} <ArrowRightOutlined />
            </a-button>
          </template>
          <a-empty v-if="!data?.recentDeployments?.length" :description="t('paas.empty.deployments')" />
          <div v-else class="deploy-rows">
            <div v-for="item in data.recentDeployments" :key="item.id" class="deploy-row">
              <div class="deploy-main">
                <span class="app-link" @click="router.push(`/apps/${item.appId}`)">{{ item.appName }}</span>
                <a-tag class="deploy-number">#{{ item.number }}</a-tag>
                <a-tag :color="statusColor(item.status)">{{ t(`paas.status.${item.status}`) }}</a-tag>
              </div>
              <div class="deploy-sub">{{ item.trigger === 'rollback' ? t('paas.deploy.rollback') : t('paas.deploy.manual') }} · {{ formatTime(item.createdAt, 'MM-DD HH:mm') }}</div>
            </div>
          </div>
        </a-card>

        <a-card variant="borderless" :title="t('paas.overview.resources')">
          <div class="resource-line">
            <span>{{ t('paas.overview.cpuAllocated') }}</span>
            <a-progress
              :percent="Math.min(100, Math.round(((data?.stats?.cpuCores || 0) / 8) * 100))"
              :format="() => `${data?.stats?.cpuCores || 0} core`"
              size="small"
            />
          </div>
          <div class="resource-line">
            <span>{{ t('paas.overview.memoryAllocated') }}</span>
            <a-progress
              :percent="Math.min(100, Math.round(((data?.stats?.memoryMb || 0) / 4096) * 100))"
              :format="() => `${data?.stats?.memoryMb || 0} MB`"
              size="small"
            />
          </div>
          <a-divider />
          <div class="resource-meta">
            <a-statistic :title="t('paas.overview.stopped')" :value="data?.stats?.stopped || 0" />
            <a-statistic :title="t('paas.overview.failed')" :value="data?.stats?.failed || 0" />
          </div>
        </a-card>
      </div>

      <a-card variant="borderless" :title="t('paas.overview.events')" class="events-card">
        <a-empty v-if="!data?.events?.length" :description="t('paas.empty.events')" />
        <a-timeline v-else>
          <a-timeline-item
            v-for="event in data.events"
            :key="event.id"
            :color="event.level === 'error' ? 'red' : event.level === 'success' ? 'green' : event.level === 'warn' ? 'orange' : 'blue'"
          >
            <span class="event-time">{{ formatTime(event.createdAt, 'MM-DD HH:mm:ss') }}</span>
            {{ event.message }}
          </a-timeline-item>
        </a-timeline>
      </a-card>
    </a-spin>
  </div>
</template>

<style scoped>
.paas-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-card :deep(.ant-card-body) {
  padding: 20px 24px;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.hero-title {
  margin: 0 0 4px;
}

.hero-desc {
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.fallback-alert {
  margin-top: 16px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card :deep(.ant-card-body) {
  padding: 20px;
}

.stat-inner {
  display: flex;
  align-items: center;
  gap: 14px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: rgba(76, 139, 245, 0.12);
  color: #4c8bf5;
  flex: none;
}

.stat-value {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.1;
}

.stat-suffix {
  font-size: 14px;
  margin-left: 2px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.deploy-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.deploy-rows {
  display: flex;
  flex-direction: column;
}

.deploy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
  flex-wrap: wrap;
}

.deploy-row:last-child {
  border-bottom: none;
}

.deploy-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.deploy-number {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.deploy-sub {
  font-size: 12px;
  color: var(--text-tertiary);
}

.app-link {
  cursor: pointer;
  font-weight: 500;
}

.resource-line {
  margin-bottom: 12px;
  font-size: 13px;
}

.resource-line > span {
  display: block;
  margin-bottom: 4px;
  color: var(--text-secondary);
}

.resource-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.event-time {
  color: var(--text-tertiary);
  margin-right: 8px;
  font-size: 12px;
}

@media (max-width: 1023px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .hero {
    flex-direction: column;
  }
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .stat-card :deep(.ant-card-body) {
    padding: 14px;
  }
  .stat-value {
    font-size: 22px;
  }
}
</style>
