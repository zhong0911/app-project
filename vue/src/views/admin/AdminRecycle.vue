<script setup>
// 回收站：按资源类型分 tab 展示软删除数据，当前只实现「用户」回收站
// （角色 / 部门等其他类型的 tab 预留，等有对应数据再补 tab 项，避免空壳）
// 表格只用 a-table 本身的能力（分页用表格自带的）
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ReloadOutlined } from '@antdv-next/icons'
import { message, modal } from '@/utils/app'
import { getAdminRecycleApi, purgeAdminUserApi, restoreAdminUserApi } from '@/api/admin'

const { t } = useI18n()

/** 当前 tab：默认用户回收站；后续新增类型时在此切换对应的数据源 */
const activeTab = ref('users')

const loading = ref(false)
const records = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)

const columns = computed(() => [
  { title: t('adminRecycle.columns.uid'), dataIndex: 'uid', key: 'uid', ellipsis: true },
  { title: t('adminRecycle.columns.role'), dataIndex: 'role', key: 'role' },
  { title: t('adminRecycle.columns.id'), dataIndex: 'id', key: 'id' },
  { title: t('adminRecycle.columns.deletedAt'), dataIndex: 'updateTime', key: 'updateTime', width: 170 },
  { title: t('adminRecycle.columns.action'), key: 'action', width: 150 },
])

/** 表格自带分页（默认靠右） */
const pagination = computed(() => ({
  current: pageNum.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count) => t('common.total', { total: count }),
}))

const load = async () => {
  loading.value = true
  try {
    const { data } = await getAdminRecycleApi({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
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

/** 刷新列表（回收站不再提供条件筛选，回到第一页重拉） */
const handleRefresh = () => {
  pageNum.value = 1
  load()
}
/** 表格分页变化 */
const handleTableChange = (pag) => {
  pageNum.value = pag.current
  pageSize.value = pag.pageSize
  load()
}

const handleRestore = (record) => {
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

const handlePurge = (record) => {
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
      <a-tooltip :title="t('common.refresh')">
        <a-button :loading="loading" @click="handleRefresh">
          <ReloadOutlined />
        </a-button>
      </a-tooltip>
    </template>

    <!-- 按类型分 tab：当前只有「用户」回收站；其他类型（角色/部门等）预留，等有数据再补 tab 项 -->
    <a-tabs v-model:active-key="activeTab" class="recycle-tabs">
      <a-tab-pane key="users" :tab="t('adminRecycle.tabUsers')">
        <a-alert type="info" show-icon :message="t('adminRecycle.hint')" class="recycle-hint" />

        <a-table
          :columns="columns"
          :data-source="records"
          :loading="loading"
          :pagination="pagination"
          row-key="id"
          @change="handleTableChange"
        >
          <template #emptyText>
            <a-empty :description="t('adminRecycle.empty')" />
          </template>

          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'uid'">
              <span class="mono uid-text" :title="record.uid">{{ record.uid }}</span>
            </template>

            <template v-else-if="column.key === 'role'">
              <a-tag :color="record.role === 'ADMIN' ? 'gold' : 'default'" class="row-tag">
                {{ record.role }}
              </a-tag>
            </template>

            <template v-else-if="column.key === 'id'">
              <span class="meta-text mono">#{{ record.id }}</span>
            </template>

            <template v-else-if="column.key === 'updateTime'">
              <span class="meta-text mono">{{ record.updateTime }}</span>
            </template>

            <template v-else-if="column.key === 'action'">
              <span class="cell-action">
                <a-button type="link" size="small" @click="handleRestore(record)">
                  {{ t('adminRecycle.restore') }}
                </a-button>
                <a-button type="link" size="small" danger @click="handlePurge(record)">
                  {{ t('adminRecycle.purge') }}
                </a-button>
              </span>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </a-card>
</template>

<style scoped>
.admin-card {
  border-radius: 12px;
}

.recycle-hint {
  margin-bottom: 16px;
}

/* 分类型 tab：去掉顶部多余间距，tab 内容紧贴标题栏下方 */
.recycle-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 16px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.uid-text {
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
}

.row-tag {
  margin-inline-end: 0;
}

.meta-text {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.cell-action {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}

/* 窄屏：操作列文字按钮收紧，避免换行 */
@media (max-width: 767px) {
  .cell-action {
    gap: 0;
  }

  .cell-action :deep(.ant-btn-link) {
    padding-inline: 4px;
  }
}
</style>
