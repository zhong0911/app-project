<script setup>
// 用户管理页：a-table 表格，列为 UID / 角色 / 状态 / 上次登录时间 / 操作（编辑 · 停用启用 · 删除）
// 表格本身不带分页（pagination=false），分页组件单独靠右放置；列宽固定 + 横向滚动，保证窄屏也不挤坏
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBreakpoint } from 'antdv-next'
import { PlusOutlined, ReloadOutlined } from '@antdv-next/icons'
import { message, modal } from '@/utils/app'
import { useUserStore } from '@/stores/modules/user'
import {
  createAdminUserApi,
  deleteAdminUserApi,
  getAdminRolesApi,
  getAdminUsersApi,
  updateAdminUserApi,
  updateAdminUserStatusApi,
} from '@/api/admin'

const userStore = useUserStore()
const screens = useBreakpoint(true, { md: true, lg: true, xl: true })
const { t } = useI18n()

const loading = ref(false)
const records = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const filters = reactive({ uid: '', status: undefined, role: undefined })

/** 角色字典（来自后端「角色管理」，内置 ADMIN / USER；接口失败时退回内置两项） */
const roles = ref([])
const roleOptions = computed(() =>
  roles.value.length
    ? roles.value.map((role) => ({ value: role.code, label: `${role.name}（${role.code}）` }))
    : [
        { value: 'ADMIN', label: 'ADMIN' },
        { value: 'USER', label: 'USER' },
      ],
)
const roleName = (code) => roles.value.find((role) => role.code === code)?.name || code

const addOpen = ref(false)
const submitting = ref(false)
const addForm = reactive({ uid: '' })

/** 编辑弹窗：当前仅调整本地角色（uid 由 SSO 提供，不可修改） */
const editOpen = ref(false)
const editing = ref(null)
const editForm = reactive({ role: '' })

/** 表格列定义：列宽按内容给固定值，宽屏自动铺满，窄屏靠 scroll.x 横向滚动 */
const columns = computed(() => [
  { title: t('adminUsers.columns.uid'), dataIndex: 'uid', key: 'uid', width: 84, ellipsis: true },
  { title: t('adminUsers.columns.role'), dataIndex: 'role', key: 'role', width: 88 },
  { title: t('adminUsers.columns.status'), dataIndex: 'status', key: 'status', width: 72 },
  { title: t('adminUsers.lastLoginAt'), dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 134 },
  { title: t('adminUsers.columns.action'), key: 'action', width: 152, align: 'right' },
])

const rowKey = (record) => record.id

/** 宽屏不需要横向滚动，窄屏（md 以下）给一个最小宽度让表格横向滚动 */
const scrollCfg = computed(() => (screens.value?.md ? {} : { x: 530 }))

/** 当前登录管理员自身：禁止禁用/删除自己，避免把自己锁在后台外 */
const isSelf = (record) => record.uid === userStore.userInfo?.uid

const load = async () => {
  loading.value = true
  try {
    const { data } = await getAdminUsersApi({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      uid: filters.uid || undefined,
      role: filters.role,
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

/** 拉取角色字典（失败时用内置 ADMIN / USER 兜底，不阻塞列表展示） */
const loadRoles = async () => {
  try {
    const { data } = await getAdminRolesApi({ includeDisabled: true })
    roles.value = data || []
  } catch {
    roles.value = []
  }
}

const handleSearch = () => {
  pageNum.value = 1
  load()
}

/** 分页变化（页码 / 每页条数） */
const handlePageChange = (page, size) => {
  pageNum.value = page
  pageSize.value = size
  load()
}

const openAdd = () => {
  addForm.uid = ''
  addOpen.value = true
}

const handleAdd = async () => {
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
    records.value = []
    await load()
  } finally {
    submitting.value = false
  }
}

const openEdit = (record) => {
  editing.value = record
  editForm.role = record.role
  editOpen.value = true
}

const handleEdit = async () => {
  if (!editForm.role) {
    message.warning(t('adminUsers.roleRequired'))
    return
  }
  submitting.value = true
  try {
    await updateAdminUserApi(editing.value.id, { role: editForm.role })
    message.success(t('adminUsers.editSuccess'))
    editOpen.value = false
    await load()
  } finally {
    submitting.value = false
  }
}

const handleStatus = async (record, checked) => {
  try {
    await updateAdminUserStatusApi(record.id, checked ? 1 : 0)
    message.success(t(checked ? 'adminUsers.enableSuccess' : 'adminUsers.disableSuccess'))
    await load()
  } catch {
    // 失败时重新拉取，保证状态与后端一致
    await load()
  }
}

const handleDelete = (record) => {
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

onMounted(async () => {
  await loadRoles()
  await load()
})
</script>

<template>
  <a-card variant="borderless" class="admin-card">
    <template #title>{{ t('adminUsers.title') }}</template>
    <template #extra>
      <a-space wrap>
        <a-input
          v-model:value="filters.uid"
          :placeholder="t('adminUsers.searchUid')"
          allow-clear
          style="width: 180px"
          @press-enter="handleSearch"
        />
        <a-select
          v-model:value="filters.role"
          :placeholder="t('common.role')"
          allow-clear
          style="width: 130px"
          :options="roleOptions"
          @change="handleSearch"
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
          {{ t('common.refresh') }}
        </a-button>
        <a-button type="primary" @click="openAdd">
          <PlusOutlined />
          {{ t('adminUsers.addUser') }}
        </a-button>
      </a-space>
    </template>

    <a-table
      :columns="columns"
      :data-source="records"
      :loading="loading"
      :pagination="false"
      :row-key="rowKey"
      :scroll="scrollCfg"
      size="middle"
      class="user-table"
    >
      <template #emptyText>
        <a-empty :description="t('adminUsers.empty')" />
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'uid'">
          <span class="cell-uid">
            <span class="mono uid-text" :title="record.uid">{{ record.uid }}</span>
            <a-tag v-if="isSelf(record)" color="blue" class="row-tag">{{ t('adminUsers.me') }}</a-tag>
          </span>
        </template>

        <template v-else-if="column.key === 'role'">
          <a-tag :color="record.role === 'ADMIN' ? 'gold' : 'default'" class="row-tag">
            {{ roleName(record.role) }}
          </a-tag>
        </template>

        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.status === 1 ? 'success' : 'default'" class="row-tag">
            {{ record.status === 1 ? t('common.enabled') : t('common.disabled') }}
          </a-tag>
        </template>

        <template v-else-if="column.key === 'lastLoginAt'">
          <span class="meta-text mono">
            {{ record.lastLoginAt || t('adminUsers.neverLoggedIn') }}
          </span>
        </template>

        <template v-else-if="column.key === 'action'">
          <span class="cell-action">
            <a-button type="link" size="small" :disabled="isSelf(record)" @click="openEdit(record)">
              {{ t('common.edit') }}
            </a-button>
            <a-button
              type="link"
              size="small"
              :disabled="isSelf(record)"
              @click="handleStatus(record, record.status !== 1)"
            >
              {{ record.status === 1 ? t('common.disable') : t('common.enable') }}
            </a-button>
            <a-button type="link" size="small" danger :disabled="isSelf(record)" @click="handleDelete(record)">
              {{ t('common.delete') }}
            </a-button>
          </span>
        </template>
      </template>
    </a-table>

    <!-- 分页靠右 -->
    <div class="pager">
      <a-pagination
        :current="pageNum"
        :page-size="pageSize"
        :total="total"
        show-size-changer
        :show-total="(count) => t('common.total', { total: count })"
        @change="handlePageChange"
        @show-size-change="handlePageChange"
      />
    </div>
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
      <a-alert type="info" show-icon :message="t('adminUsers.uidHint')" />
    </a-form>
  </a-modal>

  <a-modal
    v-model:open="editOpen"
    :title="t('adminUsers.editTitle')"
    :ok-text="t('adminUsers.editOk')"
    :confirm-loading="submitting"
    @ok="handleEdit"
  >
    <a-form layout="vertical">
      <a-form-item :label="t('adminUsers.columns.uid')">
        <a-input :value="editing?.uid" disabled />
      </a-form-item>
      <a-form-item :label="t('adminUsers.roleLabel')" required>
        <a-select v-model:value="editForm.role" :options="roleOptions" />
      </a-form-item>
      <a-alert type="info" show-icon :message="t('adminUsers.roleHint')" />
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

.cell-uid {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
}

.uid-text {
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
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
  justify-content: flex-end;
  gap: 2px;
  white-space: nowrap;
}

/* 分页靠右对齐 */
.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

/* 窄屏：操作列按钮收紧、分页居中 */
@media (max-width: 767px) {
  .cell-action {
    gap: 0;
  }

  .cell-action :deep(.ant-btn-link) {
    padding-inline: 4px;
  }

  .pager {
    justify-content: center;
  }
}
</style>
