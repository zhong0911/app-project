<script setup>
// 用户管理页：列表 / 添加（指定 SSO uid）/ 启停 / 软删除（移入回收站）
import { computed, onMounted, reactive, ref } from 'vue'
import { PlusOutlined, ReloadOutlined } from '@antdv-next/icons'
import { message, modal } from '@/utils/app'
import { useUserStore } from '@/stores/modules/user'
import {
  createAdminUserApi,
  deleteAdminUserApi,
  getAdminUsersApi,
  updateAdminUserStatusApi,
} from '@/api/admin'

const userStore = useUserStore()

const loading = ref(false)
const records = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const filters = reactive({ uid: '', status: undefined })

const addOpen = ref(false)
const submitting = ref(false)
const addForm = reactive({ uid: '' })

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: 'SSO UID', dataIndex: 'uid', key: 'uid' },
  { title: '角色', dataIndex: 'role', key: 'role', width: 110 },
  { title: '状态', key: 'status', width: 160 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 180 },
  { title: '操作', key: 'action', width: 120 },
]

const pagination = computed(() => ({
  current: pageNum.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
}))

/** 当前登录管理员自身：禁止禁用/删除自己，避免把自己锁在后台外 */
function isSelf(record) {
  return record.uid === userStore.userInfo?.uid
}

async function load() {
  loading.value = true
  try {
    const { data } = await getAdminUsersApi({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      uid: filters.uid || undefined,
      status: filters.status,
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

function handleReset() {
  filters.uid = ''
  filters.status = undefined
  pageNum.value = 1
  load()
}

function handleTableChange(p) {
  pageNum.value = p.current
  pageSize.value = p.pageSize
  load()
}

function openAdd() {
  addForm.uid = ''
  addOpen.value = true
}

async function handleAdd() {
  const uid = addForm.uid.trim()
  if (!uid) {
    message.warning('请输入 SSO 用户 uid')
    return
  }
  submitting.value = true
  try {
    await createAdminUserApi({ uid })
    message.success('用户已添加')
    addOpen.value = false
    pageNum.value = 1
    await load()
  } finally {
    submitting.value = false
  }
}

async function handleStatus(record, checked) {
  try {
    await updateAdminUserStatusApi(record.id, checked ? 1 : 0)
    message.success(checked ? '已启用' : '已禁用')
    await load()
  } catch {
    // 失败时重新拉取，保证开关状态与后端一致
    await load()
  }
}

function handleDelete(record) {
  modal.confirm({
    title: '移入回收站',
    content: `确认将用户 uid=${record.uid} 移入回收站？可在回收站恢复。`,
    okText: '移入回收站',
    okButtonProps: { danger: true },
    onOk: async () => {
      await deleteAdminUserApi(record.id)
      message.success('已移入回收站')
      if (records.value.length === 1 && pageNum.value > 1) pageNum.value -= 1
      await load()
    },
  })
}

onMounted(load)
</script>

<template>
  <a-card :bordered="false" class="admin-card">
    <template #title>用户管理</template>
    <template #extra>
      <a-space>
        <a-input
          v-model:value="filters.uid"
          placeholder="按 SSO uid 搜索"
          allow-clear
          style="width: 180px"
          @press-enter="handleSearch"
        />
        <a-select
          v-model:value="filters.status"
          placeholder="状态"
          allow-clear
          style="width: 110px"
          :options="[
            { value: 1, label: '启用' },
            { value: 0, label: '禁用' },
          ]"
          @change="handleSearch"
        />
        <a-button type="primary" @click="handleSearch">
          <ReloadOutlined />
          查询
        </a-button>
        <a-button @click="handleReset">重置</a-button>
        <a-button type="primary" @click="openAdd">
          <PlusOutlined />
          添加用户
        </a-button>
      </a-space>
    </template>

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
          <a-space>
            <span class="mono">{{ record.uid }}</span>
            <a-tag v-if="record.uid === userStore.userInfo?.uid" color="blue">我</a-tag>
          </a-space>
        </template>
        <template v-else-if="column.key === 'role'">
          <a-tag :color="record.role === 'ADMIN' ? 'gold' : 'default'">{{ record.role }}</a-tag>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-space>
            <a-switch
              :checked="record.status === 1"
              :disabled="isSelf(record)"
              @change="(checked) => handleStatus(record, checked)"
            />
            <span :class="record.status === 1 ? 'status-on' : 'status-off'">
              {{ record.status === 1 ? '启用' : '禁用' }}
            </span>
          </a-space>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button
            type="link"
            size="small"
            danger
            :disabled="isSelf(record)"
            @click="handleDelete(record)"
          >
            删除
          </a-button>
        </template>
      </template>
    </a-table>
  </a-card>

  <a-modal
    v-model:open="addOpen"
    title="添加用户"
    ok-text="添加"
    :confirm-loading="submitting"
    @ok="handleAdd"
  >
    <a-form layout="vertical">
      <a-form-item label="SSO 用户 uid（access_token 的 sub）" required>
        <a-input v-model:value="addForm.uid" placeholder="请输入 SSO 中的用户 uid" allow-clear />
      </a-form-item>
      <a-alert
        type="info"
        show-icon
        message="用户唯一标识为 SSO uid；添加后可在列表中启用/禁用或软删除。"
      />
    </a-form>
  </a-modal>
</template>

<style scoped>
.admin-card {
  border-radius: 12px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.status-on {
  color: #52c41a;
}

.status-off {
  color: var(--text-tertiary);
}
</style>
