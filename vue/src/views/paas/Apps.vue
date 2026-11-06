<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  CloudUploadOutlined,
  DeleteOutlined,
  MoreOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  SyncOutlined,
} from '@antdv-next/icons'
import { appActionApi, deleteAppApi, deployAppApi, getAppsApi } from '@/api/paas'
import { formatTime, statusColor } from '@/utils/paas'
import { message, modal } from '@/utils/app'
import AppFormModal from './AppFormModal.vue'

const router = useRouter()
const { t } = useI18n()

const loading = ref(false)
const apps = ref([])
const keyword = ref('')
const status = ref('')
const formOpen = ref(false)
const editing = ref(null)
const acting = ref({})

const statusOptions = computed(() => [
  { label: t('paas.status.all'), value: '' },
  { label: t('paas.status.running'), value: 'running' },
  { label: t('paas.status.building'), value: 'building' },
  { label: t('paas.status.stopped'), value: 'stopped' },
  { label: t('paas.status.failed'), value: 'failed' },
])

async function load() {
  loading.value = true
  try {
    const { data } = await getAppsApi({ keyword: keyword.value, status: status.value })
    apps.value = data.items || []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(app) {
  editing.value = app
  formOpen.value = true
}

async function deploy(app) {
  acting.value = { ...acting.value, [app.id]: 'deploy' }
  try {
    await deployAppApi(app.id)
    message.success(t('paas.apps.deployStarted'))
    router.push(`/apps/${app.id}`)
  } finally {
    acting.value = { ...acting.value, [app.id]: null }
  }
}

async function action(app, type) {
  acting.value = { ...acting.value, [app.id]: type }
  try {
    await appActionApi(app.id, type)
    message.success(t('paas.apps.actionSuccess'))
    await load()
  } finally {
    acting.value = { ...acting.value, [app.id]: null }
  }
}

function confirmDelete(app) {
  modal.confirm({
    title: t('paas.apps.deleteTitle'),
    content: t('paas.apps.deleteConfirm', { name: app.name }),
    okText: t('paas.common.delete'),
    okButtonProps: { danger: true },
    cancelText: t('paas.common.cancel'),
    onOk: async () => {
      await deleteAppApi(app.id)
      message.success(t('paas.apps.deleteSuccess'))
      await load()
    },
  })
}

function menuItems(app) {
  return [
    { key: 'edit', icon: SettingOutlined, label: t('paas.apps.editConfig') },
    { key: 'restart', icon: SyncOutlined, label: t('paas.apps.restart'), disabled: !app.containerId },
    {
      key: app.status === 'running' ? 'stop' : 'start',
      icon: app.status === 'running' ? PauseCircleOutlined : PlayCircleOutlined,
      label: app.status === 'running' ? t('paas.apps.stop') : t('paas.apps.start'),
      disabled: !app.containerId,
    },
    { key: 'delete', icon: DeleteOutlined, label: t('paas.apps.delete'), danger: true },
  ]
}

function handleMenu({ key }, app) {
  if (key === 'edit') openEdit(app)
  else if (key === 'delete') confirmDelete(app)
  else action(app, key)
}

onMounted(load)
</script>

<template>
  <div class="paas-page">
    <a-card variant="borderless">
      <div class="toolbar">
        <div class="toolbar-left">
          <a-input-search
            v-model:value="keyword"
            :placeholder="t('paas.apps.searchPlaceholder')"
            allow-clear
            class="search"
            @search="load"
          />
          <a-select v-model:value="status" :options="statusOptions" class="status-filter" @change="load" />
          <a-button type="text" :loading="loading" @click="load"><ReloadOutlined /></a-button>
        </div>
        <a-button type="primary" @click="openCreate">
          <PlusOutlined />
          {{ t('paas.apps.create') }}
        </a-button>
      </div>
    </a-card>

    <a-spin :spinning="loading">
      <a-empty v-if="!apps.length" :description="t('paas.apps.empty')">
        <a-button type="primary" @click="openCreate">
          <PlusOutlined />
          {{ t('paas.apps.create') }}
        </a-button>
      </a-empty>

      <div v-else class="app-grid">
        <a-card v-for="app in apps" :key="app.id" variant="borderless" class="app-card" hoverable>
          <div class="app-head">
            <div class="app-title" @click="router.push(`/apps/${app.id}`)">
              <span class="app-name">{{ app.name }}</span>
              <a-tag :color="statusColor(app.status)" class="status-tag">{{ t(`paas.status.${app.status}`) }}</a-tag>
            </div>
            <a-dropdown :trigger="['click']" :menu="{ items: menuItems(app) }" @menu-click="handleMenu($event, app)">
              <a-button type="text" size="small"><MoreOutlined /></a-button>
            </a-dropdown>
          </div>

          <div class="app-meta">
            <span class="mono">{{ app.slug }}</span>
            <a-tag>{{ app.sourceType === 'git' ? t('paas.apps.gitSource') : t('paas.apps.imageSource') }}</a-tag>
          </div>

          <div class="app-url">
            <a-typography-link v-if="app.url" :href="app.url" target="_blank">{{ app.url }}</a-typography-link>
            <span v-else class="muted">{{ t('paas.apps.notDeployed') }}</span>
          </div>

          <div class="app-foot">
            <div class="app-foot-meta">
              <span>{{ t('paas.apps.lastDeploy') }}:</span>
              <span v-if="app.lastDeployment" class="muted">
                #{{ app.lastDeployment.number }} · {{ formatTime(app.lastDeployment.createdAt, 'MM-DD HH:mm') }}
              </span>
              <span v-else class="muted">-</span>
            </div>
            <a-space :size="8">
              <a-button size="small" :loading="acting[app.id] === 'deploy'" @click="deploy(app)">
                <CloudUploadOutlined />
                {{ t('paas.apps.deploy') }}
              </a-button>
              <a-button size="small" type="primary" ghost @click="router.push(`/apps/${app.id}`)">
                {{ t('paas.common.detail') }}
              </a-button>
            </a-space>
          </div>
        </a-card>
      </div>
    </a-spin>

    <AppFormModal v-model:open="formOpen" :app="editing" @saved="load" />
  </div>
</template>

<style scoped>
.paas-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.search {
  width: 240px;
}

.status-filter {
  width: 140px;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.app-card :deep(.ant-card-body) {
  padding: 18px;
}

.app-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  min-width: 0;
}

.app-name {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 10px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: var(--text-tertiary);
}

.app-url {
  font-size: 13px;
  margin-bottom: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted {
  color: var(--text-tertiary);
}

.app-foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  border-top: 1px solid rgba(128, 128, 128, 0.12);
  padding-top: 12px;
}

.app-foot-meta {
  display: flex;
  gap: 6px;
  font-size: 12px;
  flex-wrap: wrap;
}

@media (max-width: 767px) {
  .search {
    width: 100%;
  }
  .toolbar-left {
    width: 100%;
  }
  .status-filter {
    flex: 1;
  }
  .app-grid {
    grid-template-columns: 1fr;
  }
}
</style>
