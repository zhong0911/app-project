<script setup>
// 回收站：展示软删除用户，支持恢复与彻底删除
import { computed, onMounted, reactive, ref } from 'vue'
import { ReloadOutlined } from '@antdv-next/icons'
import { message, modal } from '@/utils/app'
import {
  getAdminRecycleApi,
  purgeAdminUserApi,
  restoreAdminUserApi,
} from '@/api/admin'

const loading = ref(false)
const records = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const filters = reactive({ uid: '' })

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: 'SSO UID', dataIndex: 'uid', key: 'uid' },
  { title: '角色', dataIndex: 'role', key: 'role', width: 110 },
  { title: '删除时间', dataIndex: 'updateTime', key: 'updateTime', width: 180 },
  { title: '操作', key: 'action', width: 180 },
]

const pagination = computed(() => ({
  current: pageNum.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
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
    title: '恢复用户',
    content: `确认恢复用户 uid=${record.uid}？恢复后将回到用户列表。`,
    onOk: async () => {
      await restoreAdminUserApi(record.id)
      message.success('已恢复')
      if (records.value.length === 1 && pageNum.value > 1) pageNum.value -= 1
      await load()
    },
  })
}

function handlePurge(record) {
  modal.confirm({
    title: '彻底删除',
    content: `确认彻底删除用户 uid=${record.uid}？该操作不可恢复。`,
    okText: '彻底删除',
    okButtonProps: { danger: true },
    onOk: async () => {
      await purgeAdminUserApi(record.id)
      message.success('已彻底删除')
      if (records.value.length === 1 && pageNum.value > 1) pageNum.value -= 1
      await load()
    },
  })
}

onMounted(load)
</script>

<template>
  <a-card :bordered="false" class="admin-card">
    <template #title>回收站</template>
    <template #extra>
      <a-space>
        <a-input
          v-model:value="filters.uid"
          placeholder="按 SSO uid 搜索"
          allow-clear
          style="width: 180px"
          @press-enter="handleSearch"
        />
        <a-button type="primary" @click="handleSearch">
          <ReloadOutlined />
          查询
        </a-button>
      </a-space>
    </template>

    <a-alert
      type="info"
      show-icon
      message="回收站中的用户为软删除状态，可恢复到用户列表，或彻底删除（不可恢复）。"
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
            <a-button type="link" size="small" @click="handleRestore(record)">恢复</a-button>
            <a-button type="link" size="small" danger @click="handlePurge(record)">彻底删除</a-button>
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
