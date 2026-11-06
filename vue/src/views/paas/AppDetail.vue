<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  CopyOutlined,
  HistoryOutlined,
  LinkOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  SyncOutlined,
} from '@antdv-next/icons'
import {
  appActionApi,
  appLogStreamUrl,
  deployAppApi,
  deploymentStreamUrl,
  getAppApi,
  getMetricsApi,
  rollbackAppApi,
} from '@/api/paas'
import { formatTime, memoryPercent, statusColor } from '@/utils/paas'
import { message, modal } from '@/utils/app'
import AppFormModal from './AppFormModal.vue'
import TerminalLog from './TerminalLog.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const loading = ref(true)
const app = ref(null)
const metrics = ref({})
const activeTab = ref('deployments')
const logLines = ref([])
const logConnected = ref(false)
const formOpen = ref(false)
const acting = ref('')
const deployOpen = ref(false)
const deployLines = ref([])
const deployStatus = ref('')
const deployNumber = ref(null)
let appSource = null
let deploySource = null
let metricsTimer = null

const appId = computed(() => route.params.id)
const running = computed(() => app.value?.status === 'running')

async function load(showLoading = true) {
  if (showLoading) loading.value = true
  try {
    const { data } = await getAppApi(appId.value)
    app.value = data
    deployStatus.value = data.runtime?.status || data.status
  } finally {
    loading.value = false
  }
}

async function loadMetrics() {
  if (!app.value?.containerId || !running.value) {
    metrics.value = {}
    return
  }
  try {
    const { data } = await getMetricsApi(appId.value)
    metrics.value = data
  } catch {
    metrics.value = {}
  }
}

function startMetrics() {
  stopMetrics()
  loadMetrics()
  metricsTimer = setInterval(loadMetrics, 10000)
}

function stopMetrics() {
  if (metricsTimer) clearInterval(metricsTimer)
  metricsTimer = null
}

/* ---------------- 运行日志（SSE） ---------------- */
function startAppLog() {
  stopAppLog()
  if (!app.value?.containerId) return
  logLines.value = []
  const source = new EventSource(appLogStreamUrl(appId.value, 200))
  appSource = source
  logConnected.value = true
  source.onmessage = (event) => {
    try {
      const line = JSON.parse(event.data)
      pushLog(logLines, line)
    } catch {
      pushLog(logLines, event.data)
    }
  }
  source.addEventListener('error', () => {
    logConnected.value = false
    source.close()
  })
}

function stopAppLog() {
  if (appSource) appSource.close()
  appSource = null
  logConnected.value = false
}

function pushLog(target, line) {
  target.value.push(line)
  if (target.value.length > 2000) target.value.splice(0, target.value.length - 2000)
}

/* ---------------- 部署日志（SSE） ---------------- */
function streamDeployment(id, number) {
  stopDeployLog()
  deployLines.value = []
  deployNumber.value = number
  const source = new EventSource(deploymentStreamUrl(id))
  deploySource = source
  source.onmessage = (event) => {
    try {
      pushLog(deployLines, JSON.parse(event.data))
    } catch {
      pushLog(deployLines, event.data)
    }
  }
  source.addEventListener('status', (event) => {
    try {
      deployStatus.value = JSON.parse(event.data)?.status
    } catch {
      // 忽略解析失败
    }
  })
  source.addEventListener('end', async () => {
    stopDeployLog()
    await load(false)
    await loadMetrics()
  })
  source.addEventListener('error', () => {
    stopDeployLog()
    load(false)
  })
}

function stopDeployLog() {
  if (deploySource) deploySource.close()
  deploySource = null
}

async function deploy() {
  acting.value = 'deploy'
  try {
    const { data } = await deployAppApi(appId.value)
    deployOpen.value = true
    deployStatus.value = data.status
    streamDeployment(data.id, data.number)
    message.success(t('paas.detail.deployStarted'))
  } finally {
    acting.value = ''
  }
}

async function rollback(item) {
  modal.confirm({
    title: t('paas.detail.rollbackTitle'),
    content: t('paas.detail.rollbackConfirm', { number: item.number }),
    okText: t('paas.detail.rollback'),
    okButtonProps: { danger: true },
    cancelText: t('paas.common.cancel'),
    onOk: async () => {
      const { data } = await rollbackAppApi(appId.value, item.id)
      deployOpen.value = true
      deployStatus.value = data.status
      streamDeployment(data.id, data.number)
    },
  })
}

async function action(type) {
  acting.value = type
  try {
    await appActionApi(appId.value, type)
    message.success(t('paas.detail.actionSuccess'))
    await load(false)
    await loadMetrics()
  } finally {
    acting.value = ''
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(app.value.url)
    message.success(t('paas.common.copied'))
  } catch {
    message.error(t('paas.common.copyFailed'))
  }
}

function openDeployment(item) {
  deployOpen.value = true
  deployStatus.value = item.status
  streamDeployment(item.id, item.number)
}

watch(activeTab, (tab) => {
  if (tab === 'logs') startAppLog()
  else stopAppLog()
})

watch(
  () => app.value?.containerId,
  () => {
    if (activeTab.value === 'logs') startAppLog()
    startMetrics()
  },
)

onMounted(async () => {
  await load()
  startMetrics()
  if (activeTab.value === 'logs') startAppLog()
})

onBeforeUnmount(() => {
  stopAppLog()
  stopDeployLog()
  stopMetrics()
})
</script>

<template>
  <div class="paas-page">
    <a-card variant="borderless">
      <div class="detail-head">
        <div class="head-left">
          <a-button type="text" class="back" @click="router.push('/apps')"><ArrowLeftOutlined /></a-button>
          <div>
            <div class="title-line">
              <span class="app-name">{{ app?.name || '-' }}</span>
              <a-tag v-if="app" :color="statusColor(app.status)">{{ t(`paas.status.${app.status}`) }}</a-tag>
            </div>
            <div class="sub-line">
              <span class="mono">{{ app?.slug }}</span>
              <span v-if="app?.url" class="dot">·</span>
              <a-typography-link v-if="app?.url" :href="app.url" target="_blank">{{ app.url }}</a-typography-link>
              <a-button v-if="app?.url" type="text" size="small" @click="copyUrl"><CopyOutlined /></a-button>
            </div>
          </div>
        </div>
        <a-space wrap>
          <a-button type="primary" :loading="acting === 'deploy'" @click="deploy">
            <CloudUploadOutlined />
            {{ t('paas.detail.deploy') }}
          </a-button>
          <a-button :disabled="!app?.containerId" :loading="acting === 'restart'" @click="action('restart')">
            <SyncOutlined />
            {{ t('paas.detail.restart') }}
          </a-button>
          <a-button
            v-if="running"
            :loading="acting === 'stop'"
            danger
            @click="action('stop')"
          >
            <PauseCircleOutlined />
            {{ t('paas.detail.stop') }}
          </a-button>
          <a-button v-else :disabled="!app?.containerId" :loading="acting === 'start'" @click="action('start')">
            <PlayCircleOutlined />
            {{ t('paas.detail.start') }}
          </a-button>
          <a-button @click="formOpen = true"><SettingOutlined />{{ t('paas.apps.editConfig') }}</a-button>
        </a-space>
      </div>
      <a-alert
        v-if="app && !app.containerId"
        class="not-deployed"
        type="info"
        show-icon
        :message="t('paas.detail.neverDeployed')"
      />
    </a-card>

    <a-spin :spinning="loading">
      <div class="metric-grid">
        <a-card variant="borderless" class="metric-card">
          <a-statistic :title="t('paas.detail.cpu')" :value="metrics.cpuPercent || 0" suffix="%" />
          <a-progress :percent="Math.min(100, Math.round(metrics.cpuPercent || 0))" size="small" :show-info="false" />
        </a-card>
        <a-card variant="borderless" class="metric-card">
          <a-statistic
            :title="t('paas.detail.memory')"
            :value="metrics.memoryMb || 0"
            :suffix="`/ ${metrics.memoryLimitMb || app?.memoryMb || 0} MB`"
          />
          <a-progress :percent="memoryPercent(metrics)" size="small" />
        </a-card>
        <a-card variant="borderless" class="metric-card">
          <a-statistic :title="t('paas.detail.network')" :value="metrics.networkRxMb || 0" suffix="MB" />
          <div class="metric-extra">TX {{ metrics.networkTxMb || 0 }} MB</div>
        </a-card>
        <a-card variant="borderless" class="metric-card">
          <a-statistic :title="t('paas.detail.source')" :value="app?.sourceType === 'git' ? 'Git' : 'Image'" />
          <div class="metric-extra mono">{{ app?.sourceType === 'git' ? app?.repoUrl : app?.image }}</div>
        </a-card>
      </div>

      <a-card variant="borderless" class="tabs-card">
        <a-tabs v-model:activeKey="activeTab">
          <a-tab-pane key="deployments">
            <template #tab>
              <HistoryOutlined /> {{ t('paas.detail.tabDeployments') }}
            </template>
            <a-empty v-if="!app?.deployments?.length" :description="t('paas.empty.deployments')" />
            <div v-else class="deploy-rows">
              <div v-for="item in app.deployments" :key="item.id" class="deploy-row">
                <div class="deploy-info">
                  <div class="deploy-title">
                    <strong>#{{ item.number }}</strong>
                    <a-tag :color="statusColor(item.status)">{{ t(`paas.status.${item.status}`) }}</a-tag>
                    <a-tag v-if="item.trigger === 'rollback'" color="orange">{{ t('paas.deploy.rollback') }}</a-tag>
                    <span v-if="item.commitSha" class="mono">{{ item.commitSha }}</span>
                  </div>
                  <div class="deploy-sub">
                    <span>{{ formatTime(item.createdAt) }}</span>
                    <span v-if="item.error" class="error-text"> · {{ item.error }}</span>
                  </div>
                </div>
                <a-space :size="8">
                  <a-button size="small" @click="openDeployment(item)">{{ t('paas.detail.viewLog') }}</a-button>
                  <a-button
                    v-if="item.status === 'running' && item.number !== app.deployments[0]?.number"
                    size="small"
                    danger
                    @click="rollback(item)"
                  >
                    {{ t('paas.detail.rollback') }}
                  </a-button>
                </a-space>
              </div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="logs">
            <template #tab>{{ t('paas.detail.tabLogs') }}</template>
            <div class="log-toolbar">
              <a-tag :color="logConnected ? 'green' : 'default'">
                {{ logConnected ? t('paas.detail.live') : t('paas.detail.disconnected') }}
              </a-tag>
              <a-space>
                <a-button size="small" :disabled="!app?.containerId" @click="startAppLog">
                  <ReloadOutlined />{{ t('paas.detail.refreshLog') }}
                </a-button>
              </a-space>
            </div>
            <TerminalLog :lines="logLines" height="460px" />
          </a-tab-pane>

          <a-tab-pane key="env">
            <template #tab>{{ t('paas.detail.tabEnv') }}</template>
            <a-empty v-if="!Object.keys(app?.env || {}).length" :description="t('paas.apps.envEmpty')" />
            <div v-else class="env-rows">
              <div v-for="item in Object.entries(app.env)" :key="item[0]" class="env-line">
                <span class="env-key">{{ item[0] }}</span>
                <span class="env-value mono">{{ item[1] }}</span>
              </div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="config">
            <template #tab>{{ t('paas.detail.tabConfig') }}</template>
            <a-descriptions bordered :column="1" size="small">
              <a-descriptions-item :label="t('paas.apps.name')">{{ app?.name }}</a-descriptions-item>
              <a-descriptions-item :label="t('paas.apps.sourceType')">
                {{ app?.sourceType === 'git' ? t('paas.apps.gitSource') : t('paas.apps.imageSource') }}
              </a-descriptions-item>
              <a-descriptions-item :label="t('paas.apps.repoUrl')">
                {{ app?.sourceType === 'git' ? app?.repoUrl : app?.image }}
              </a-descriptions-item>
              <a-descriptions-item v-if="app?.sourceType === 'git'" :label="t('paas.apps.branch')">
                {{ app?.branch }} / {{ app?.dockerfile }}
              </a-descriptions-item>
              <a-descriptions-item :label="t('paas.apps.port')">{{ app?.port }}</a-descriptions-item>
              <a-descriptions-item :label="t('paas.apps.cpu')">{{ app?.cpu }} core</a-descriptions-item>
              <a-descriptions-item :label="t('paas.apps.memory')">{{ app?.memoryMb }} MB</a-descriptions-item>
              <a-descriptions-item :label="t('paas.detail.containerId')">
                <span class="mono">{{ app?.containerId || '-' }}</span>
              </a-descriptions-item>
              <a-descriptions-item :label="t('paas.detail.hostPort')">{{ app?.hostPort || '-' }}</a-descriptions-item>
              <a-descriptions-item :label="t('paas.detail.createdAt')">{{ formatTime(app?.createdAt) }}</a-descriptions-item>
            </a-descriptions>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </a-spin>

    <AppFormModal v-model:open="formOpen" :app="app" @saved="load" />

    <a-drawer
      v-model:open="deployOpen"
      :title="`${t('paas.detail.deployLog')}${deployNumber ? ` · #${deployNumber}` : ''}`"
      :width="720"
      placement="right"
    >
      <template #extra>
        <a-tag :color="statusColor(deployStatus)">{{ t(`paas.status.${deployStatus || 'queued'}`) }}</a-tag>
      </template>
      <TerminalLog :lines="deployLines" height="calc(100vh - 160px)" />
    </a-drawer>
  </div>
</template>

<style scoped>
.paas-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.head-left {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.back {
  margin-top: 2px;
}

.title-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-name {
  font-size: 18px;
  font-weight: 600;
}

.sub-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
  flex-wrap: wrap;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--text-tertiary);
  font-size: 12px;
}

.dot {
  color: var(--text-tertiary);
}

.not-deployed {
  margin-top: 16px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.metric-card :deep(.ant-card-body) {
  padding: 16px 18px;
}

.metric-extra {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tabs-card :deep(.ant-card-body) {
  padding-top: 8px;
}

.deploy-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.error-text {
  color: #e5484d;
}

.log-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 8px;
}

.env-line {
  display: flex;
  gap: 16px;
  width: 100%;
  flex-wrap: wrap;
  padding: 10px 0;
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
}

.env-line:last-child {
  border-bottom: none;
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
  padding: 12px 0;
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
  flex-wrap: wrap;
}

.deploy-row:last-child {
  border-bottom: none;
}

.deploy-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.env-key {
  font-weight: 500;
  min-width: 160px;
}

.env-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  word-break: break-all;
}

@media (max-width: 1023px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .metric-card :deep(.ant-card-body) {
    padding: 12px;
  }
  .detail-head :deep(.ant-space) {
    width: 100%;
  }
  .env-key {
    min-width: 0;
  }
}
</style>
