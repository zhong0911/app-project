<script setup>
// 回收站：展示软删除用户，支持恢复与彻底删除
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ReloadOutlined } from '@antdv-next/icons'
import { message, modal } from '@/utils/app'
import {
  getAdminRecycleApi,
  purgeAdminUserApi,
  restoreAdminUserApi,
} from '@/api/admin'

const { t } = useI18n()

const loading = ref(false)
const records = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const filters = reactive({ uid: '' })

const columns = computed(() => [
  { title: t('adminRecycle.columns.id'), dataIndex: 'id', key: 'id', width: 80 },
  { title: t('adminRecycle.columns.uid'), dataIndex: 'uid', key: 'uid' },
  { title: t('adminRecycle.columns.role'), dataIndex: 'role', key: 'role', width: 110 },
  { title: t('adminRecycle.columns.deletedAt'), dataIndex: 'updateTime', key: 'updateTime', width: 180 },
  { title: t('adminRecycle.columns.action'), key: 'action', width: 180 },
])

const pagination = computed(() => ({
  current: pageNum.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count) => t('common.total', { total: count }),
}))

async function load() {
  loading.value = true
  try {
    const { data } = await getAdminRecycleApi({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      uid: filters.uid || undefined,
    })
    records.value = data.records || []
    total.value = data.total || 0
  } catch {
    // 错误提示由 axios 拦截器统一处理，这里只保证失败时不残留旧数据
    records.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pageNum.value = 1
  load()
}

function handleTableChange(p) {
  pageNum.value = p.current
  pageSize.value = p.pageSize
  load()
}

function handleRestore(record) {
  modal.confirm({
    title: t('adminRecycle.restoreTitle'),
    content: t('adminRecycle.restoreConfirm', { uid: record.uid }),
    okText: t('adminRecycle.restore'),
    onOk: async () => {
      await restoreAdminUserApi(record.id)
      message.success(t('adminRecycle.restoreSuccess'))
      if (records.value.length === 1 && pageNum.value > 1) pageNum.value -= 1
      await load()
    },
  })
}

function handlePurge(record) {
  modal.confirm({
    title: t('adminRecycle.purgeTitle'),
    content: t('adminRecycle.purgeConfirm', { uid: record.uid }),
    okText: t('adminRecycle.purgeOk'),
    okButtonProps: { danger: true },
    onOk: async () => {
      await purgeAdminUserApi(record.id)
      message.success(t('adminRecycle.purgeSuccess'))
      if (records.value.length === 1 && pageNum.value > 1) pageNum.value -= 1
      await load()
    },
  })
}

onMounted(load)
</script>

<template>
  <a-card variant="borderless" class="admin-card">
    <template #title>{{ t('adminRecycle.title') }}</template>
    <template #extra>
      <a-space>
        <a-input
          v-model:value="filters.uid"
          :placeholder="t('adminRecycle.searchUid')"
          allow-clear
          style="width: 180px"
          @press-enter="handleSearch"
        />
        <a-button type="primary" @click="handleSearch">
          <ReloadOutlined />
          {{ t('common.query') }}
        </a-button>
      </a-space>
    </template>

    <a-alert
      type="info"
      show-icon
      :message="t('adminRecycle.hint')"
      style="margin-bottom: 16px"
    />

    <a-table
      row-key="id"
      :columns="columns"
      :data-source="records"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: 760 }"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'uid'">
          <span class="mono">{{ record.uid }}</span>
        </template>
        <template v-else-if="column.key === 'role'">
          <a-tag :color="record.role === 'ADMIN' ? 'gold' : 'default'">{{ record.role }}</a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="handleRestore(record)">{{ t('adminRecycle.restore') }}</a-button>
            <a-button type="link" size="small" danger @click="handlePurge(record)">{{ t('adminRecycle.purge') }}</a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </a-card>
</template>

<style scoped>
.admin-card {
  border-radius: 12px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
</style>
