<script setup>
// 用户管理页：只用 a-table 本身的能力（不额外传 scroll / size / 外置分页），
// 列为用户唯一标识 / 角色 / 状态 / 操作（编辑 · 停用启用 · 删除）
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PlusOutlined, ReloadOutlined, SearchOutlined, SettingOutlined } from '@antdv-next/icons'
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
/** 正在提交「停用 / 启用」的行 id：按钮显示 loading，避免重复点击 */
const actingId = ref(null)

/** 列定义（可由「列设置」控制显隐；操作列固定显示） */
const columnDefs = computed(() => [
  { title: t('adminUsers.columns.uid'), dataIndex: 'uid', key: 'uid', ellipsis: true },
  { title: t('adminUsers.columns.role'), dataIndex: 'role', key: 'role', width: 140 },
  { title: t('adminUsers.columns.status'), dataIndex: 'status', key: 'status', width: 120 },
  { title: t('adminUsers.columns.action'), key: 'action', width: 170 },
])

/** 当前显示的列（默认全显） */
const visibleKeys = ref(['uid', 'role', 'status', 'action'])

const columns = computed(() => columnDefs.value.filter((col) => visibleKeys.value.includes(col.key)))

/** 列设置选项：操作列禁用取消，避免隐藏后无从操作 */
const columnOptions = computed(() =>
  columnDefs.value.map((col) => ({
    label: col.title,
    value: col.key,
    disabled: col.key === 'action',
  })),
)

// 兜底：操作列即便被取消勾选也会自动恢复，保证每行始终有可用操作
watch(visibleKeys, (keys) => {
  if (!keys.includes('action')) {
    visibleKeys.value = [...keys, 'action']
  }
})

/** 表格自带分页（默认靠右） */
const pagination = computed(() => ({
  current: pageNum.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count) => t('common.total', { total: count }),
}))

/** 当前登录管理员自身：禁止禁用/删除自己（uid 一律按字符串比较，避免 int/string 误判） */
const isSelf = (record) => String(record.uid ?? '') === String(userStore.userInfo?.uid ?? '')

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

/** 表格分页变化 */
const handleTableChange = (pag) => {
  pageNum.value = pag.current
  pageSize.value = pag.pageSize
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
  // 同一时刻只允许一行在提交，按钮用 loading 反馈，避免重复点击
  if (actingId.value !== null) {
    return
  }
  actingId.value = record.id
  try {
    await updateAdminUserStatusApi(record.id, checked ? 1 : 0)
    message.success(t(checked ? 'adminUsers.enableSuccess' : 'adminUsers.disableSuccess'))
    await load()
  } catch {
    // 失败时重新拉取，保证状态与后端一致
    await load()
  } finally {
    actingId.value = null
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
  <div class="admin-page">
    <!-- 工具栏：搜索框整行 → 状态 / 角色并排 → 添加按钮 + 刷新 / 列设置 -->
    <div class="user-toolbar">
      <div class="toolbar-row search-row">
        <a-input
          v-model:value="filters.uid"
          :placeholder="t('adminUsers.searchUid')"
          allow-clear
          class="search-input"
          @press-enter="handleSearch"
        >
          <template #prefix>
            <SearchOutlined />
          </template>
        </a-input>
        <a-button class="search-btn" @click="handleSearch">
          <SearchOutlined />
        </a-button>
      </div>

      <a-select
        v-model:value="filters.status"
        :placeholder="t('adminUsers.statusPlaceholder')"
        allow-clear
        :options="[
          { value: 1, label: t('common.enabled') },
          { value: 0, label: t('common.disabled') },
        ]"
        @change="handleSearch"
      />
      <a-select
        v-model:value="filters.role"
        :placeholder="t('common.role')"
        allow-clear
        :options="roleOptions"
        @change="handleSearch"
      />

      <div class="toolbar-row action-row">
        <a-button type="primary" @click="openAdd">
          <PlusOutlined />
          {{ t('adminUsers.addUser') }}
        </a-button>
        <a-space :size="8">
          <a-tooltip :title="t('common.refresh')">
            <a-button shape="circle" :loading="loading" @click="handleSearch">
              <ReloadOutlined />
            </a-button>
          </a-tooltip>
          <a-popover trigger="click" placement="bottomRight">
            <template #content>
              <div class="column-setting">
                <a-checkbox-group v-model:value="visibleKeys" :options="columnOptions" />
              </div>
            </template>
            <a-tooltip :title="t('adminUsers.columnSetting')">
              <a-button shape="circle">
                <SettingOutlined />
              </a-button>
            </a-tooltip>
          </a-popover>
        </a-space>
      </div>
    </div>

    <a-table
      :columns="columns"
      :data-source="records"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: 'max-content' }"
      row-key="id"
      @change="handleTableChange"
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
          <a-badge
            :status="record.status === 1 ? 'success' : 'default'"
            :text="record.status === 1 ? t('common.enabled') : t('common.disabled')"
          />
        </template>

        <template v-else-if="column.key === 'action'">
          <span class="cell-action">
            <a-button type="link" size="small" :disabled="isSelf(record)" @click="openEdit(record)">
              {{ t('common.edit') }}
            </a-button>
            <a-button
              type="link"
              size="small"
              :loading="actingId === record.id"
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
  </div>

  <a-modal
    v-model:open="addOpen"
    :title="t('adminUsers.addTitle')"
    :ok-text="t('adminUsers.addOk')"
    :confirm-loading="submitting"
    @ok="handleAdd"
  >
    <a-form layout="vertical">
      <a-form-item :label="t('adminUsers.uidLabel')" required>
        <a-input
          v-model:value="addForm.uid"
          :placeholder="t('adminUsers.uidPlaceholder')"
          :maxlength="64"
          allow-clear
        />
      </a-form-item>
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
.admin-page {
  width: 100%;
}

/* 工具栏：两列栅格 —— 搜索整行、状态/角色并排、操作行两端对齐 */
.user-toolbar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.toolbar-row {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1 1 auto;
  min-width: 0;
}

.search-btn {
  flex: 0 0 auto;
  width: 36px;
  padding-inline: 0;
}

.action-row {
  justify-content: space-between;
  margin-top: 4px;
}

.column-setting {
  min-width: 150px;
}

.column-setting :deep(.ant-checkbox-group) {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.cell-uid {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
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

/* 窄屏：操作列三个文字按钮收紧，避免换行 */
@media (max-width: 767px) {
  .cell-action {
    gap: 0;
  }

  .cell-action :deep(.ant-btn-link) {
    padding-inline: 4px;
  }
}
</style>
