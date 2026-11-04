<script setup>
// 用户管理页：列表 / 添加（指定 SSO uid）/ 启停 / 软删除（移入回收站）
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
const { t } = useI18n()

const loading = ref(false)
const records = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const filters = reactive({ uid: '', status: undefined })

const addOpen = ref(false)
const submitting = ref(false)
const addForm = reactive({ uid: '' })

const columns = computed(() => [
  { title: t('adminUsers.columns.id'), dataIndex: 'id', key: 'id', width: 80 },
  { title: t('adminUsers.columns.uid'), dataIndex: 'uid', key: 'uid' },
  { title: t('adminUsers.columns.role'), dataIndex: 'role', key: 'role', width: 110 },
  { title: t('adminUsers.columns.status'), key: 'status', width: 160 },
  { title: t('adminUsers.columns.createTime'), dataIndex: 'createTime', key: 'createTime', width: 180 },
  { title: t('adminUsers.columns.action'), key: 'action', width: 120 },
])

const pagination = computed(() => ({
  current: pageNum.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count) => t('common.total', { total: count }),
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
    message.warning(t('adminUsers.uidRequired'))
    return
  }
  submitting.value = true
  try {
    await createAdminUserApi({ uid })
    message.success(t('adminUsers.addSuccess'))
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
    message.success(t(checked ? 'adminUsers.enableSuccess' : 'adminUsers.disableSuccess'))
    await load()
  } catch {
    // 失败时重新拉取，保证开关状态与后端一致
    await load()
  }
}

function handleDelete(record) {
  modal.confirm({
    title: t('adminUsers.deleteTitle'),
    content: t('adminUsers.deleteConfirm', { uid: record.uid }),
    okText: t('adminUsers.deleteOk'),
    okButtonProps: { danger: true },
    onOk: async () => {
      await deleteAdminUserApi(record.id)
      message.success(t('adminUsers.deleteSuccess'))
      if (records.value.length === 1 && pageNum.value > 1) pageNum.value -= 1
      await load()
    },
  })
}

onMounted(load)
</script>

<template>
  <a-card variant="borderless" class="admin-card">
    <template #title>{{ t('adminUsers.title') }}</template>
    <template #extra>
      <a-space>
        <a-input
          v-model:value="filters.uid"
          :placeholder="t('adminUsers.searchUid')"
          allow-clear
          style="width: 180px"
          @press-enter="handleSearch"
        />
        <a-select
          v-model:value="filters.status"
          :placeholder="t('adminUsers.statusPlaceholder')"
          allow-clear
          style="width: 110px"
          :options="[
            { value: 1, label: t('common.enabled') },
            { value: 0, label: t('common.disabled') },
          ]"
          @change="handleSearch"
        />
        <a-button type="primary" @click="handleSearch">
          <ReloadOutlined />
          {{ t('common.query') }}
        </a-button>
        <a-button @click="handleReset">{{ t('common.reset') }}</a-button>
        <a-button type="primary" @click="openAdd">
          <PlusOutlined />
          {{ t('adminUsers.addUser') }}
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
            <a-tag v-if="record.uid === userStore.userInfo?.uid" color="blue">{{ t('adminUsers.me') }}</a-tag>
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
              {{ record.status === 1 ? t('common.enabled') : t('common.disabled') }}
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
            {{ t('common.delete') }}
          </a-button>
        </template>
      </template>
    </a-table>
  </a-card>

  <a-modal
    v-model:open="addOpen"
    :title="t('adminUsers.addTitle')"
    :ok-text="t('adminUsers.addOk')"
    :confirm-loading="submitting"
    @ok="handleAdd"
  >
    <a-form layout="vertical">
      <a-form-item :label="t('adminUsers.uidLabel')" required>
        <a-input v-model:value="addForm.uid" :placeholder="t('adminUsers.uidPlaceholder')" allow-clear />
      </a-form-item>
      <a-alert
        type="info"
        show-icon
        :message="t('adminUsers.uidHint')"
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
