<script setup>
// 角色管理页：本地角色字典（编码 / 名称 / 描述 / 状态）。
// 内置 ADMIN / USER 由后端标记 builtIn=1：编码不可改、不可删除；仍被用户引用的角色也不可删（后端校验）。
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Empty } from 'antdv-next'
import { PlusOutlined, ReloadOutlined } from '@antdv-next/icons'
import { message, modal } from '@/utils/app'
import { createAdminRoleApi, deleteAdminRoleApi, getAdminRolesApi, updateAdminRoleApi } from '@/api/admin'

const { t } = useI18n()

const loading = ref(false)
const allRecords = ref([])

/** 正在提交「停用 / 启用」的行 id：按钮显示 loading，避免重复点击 */
const actingId = ref(null)

/** 列定义（可由「列设置」控制显隐；操作列固定显示） */
const columnDefs = computed(() => [
  { title: t('adminRoles.columns.code'), dataIndex: 'code', key: 'code', width: 160 },
  { title: t('adminRoles.columns.name'), dataIndex: 'name', key: 'name', width: 160 },
  { title: t('adminRoles.columns.description'), dataIndex: 'description', key: 'description', ellipsis: true },
  { title: t('adminRoles.columns.status'), dataIndex: 'status', key: 'status', width: 120 },
  { title: t('adminRoles.columns.action'), key: 'action', width: 190 },
])

const visibleKeys = ref(['code', 'name', 'description', 'status', 'action'])

const columns = computed(() => columnDefs.value.filter((col) => visibleKeys.value.includes(col.key)))

/** 接口按启用状态维度返回全部角色（角色总量很小，不分页，页面不做关键字 / 状态筛选） */
const load = async ({ silent = false } = {}) => {
  if (!silent) loading.value = true
  try {
    const { data } = await getAdminRolesApi({ includeDisabled: true })
    allRecords.value = data || []
  } catch {
    // 错误提示由 axios 拦截器统一处理，这里只保证失败时不残留旧数据
    allRecords.value = []
  } finally {
    if (!silent) loading.value = false
  }
}

/** 旧后端可能返回不带 id 的角色项：缺 id 时禁用行内操作，避免请求 /admin/roles/undefined */
const hasId = (record) => record?.id !== undefined && record?.id !== null && record?.id !== ''

const records = computed(() => allRecords.value)

/** 编码规则与后端 RoleDTO 一致：字母开头，字母 / 数字 / 下划线，长度 2-32 */
const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_]{1,31}$/

const addOpen = ref(false)
const submitting = ref(false)
const addForm = reactive({ code: '', name: '', description: '' })

const openAdd = () => {
  addForm.code = ''
  addForm.name = ''
  addForm.description = ''
  addOpen.value = true
}

const handleAdd = async () => {
  const code = addForm.code.trim().toUpperCase()
  const name = addForm.name.trim()
  if (!code) {
    message.warning(t('adminRoles.codeRequired'))
    return
  }
  if (!CODE_PATTERN.test(code)) {
    message.warning(t('adminRoles.codeInvalid'))
    return
  }
  if (!name) {
    message.warning(t('adminRoles.nameRequired'))
    return
  }
  submitting.value = true
  try {
    await createAdminRoleApi({
      code,
      name,
      description: addForm.description.trim() || undefined,
    })
    message.success(t('adminRoles.addSuccess'))
    addOpen.value = false
    await load({ silent: true })
  } finally {
    submitting.value = false
  }
}

const editOpen = ref(false)
const editing = ref(null)
const editForm = reactive({ code: '', name: '', description: '' })

const openEdit = (record) => {
  editing.value = record
  editForm.code = record.code
  editForm.name = record.name
  editForm.description = record.description || ''
  editOpen.value = true
}

const handleEdit = async () => {
  const code = editForm.code.trim()
  const name = editForm.name.trim()
  if (!code) {
    message.warning(t('adminRoles.codeRequired'))
    return
  }
  if (!CODE_PATTERN.test(code)) {
    message.warning(t('adminRoles.codeInvalid'))
    return
  }
  if (!name) {
    message.warning(t('adminRoles.nameRequired'))
    return
  }
  submitting.value = true
  try {
    await updateAdminRoleApi(editing.value.id, {
      code,
      name,
      description: editForm.description.trim() || undefined,
      status: editing.value.status,
      sort: editing.value.sort,
    })
    message.success(t('adminRoles.editSuccess'))
    editOpen.value = false
    await load({ silent: true })
  } finally {
    submitting.value = false
  }
}

/** 停用 / 启用：后端没有独立状态端点，用整体更新（DTO 里的 code、name 必填，原值回传） */
const handleStatus = async (record, checked) => {
  if (actingId.value !== null) {
    return
  }
  actingId.value = record.id
  try {
    await updateAdminRoleApi(record.id, {
      code: record.code,
      name: record.name,
      description: record.description || undefined,
      status: checked ? 1 : 0,
      sort: record.sort,
    })
    message.success(t(checked ? 'adminRoles.enableSuccess' : 'adminRoles.disableSuccess'))
    await load({ silent: true })
  } catch {
    await load({ silent: true })
  } finally {
    actingId.value = null
  }
}

const handleDelete = (record) => {
  modal.confirm({
    title: t('adminRoles.deleteTitle'),
    content: t('adminRoles.deleteConfirm', { name: record.name }),
    okText: t('adminRoles.deleteOk'),
    okButtonProps: { danger: true },
    onOk: async () => {
      await deleteAdminRoleApi(record.id)
      message.success(t('adminRoles.deleteSuccess'))
      await load({ silent: true })
    },
  })
}

onMounted(load)
</script>

<template>
  <div class="admin-page">
    <!-- 工具栏：角色总量很小且不分页，只保留新增按钮 + 刷新 / 列设置 -->
    <div class="user-toolbar">
      <div class="toolbar-row action-row">
        <a-button type="primary" @click="openAdd">
          <PlusOutlined />
          {{ t('adminRoles.addRole') }}
        </a-button>
        <a-space :size="8">
          <a-button :loading="loading" @click="load">
            <ReloadOutlined />
          </a-button>
          <ColumnPicker
            v-model="visibleKeys"
            :columns="columnDefs"
            storage-key="admin-roles"
            :locked-keys="['action']"
          />
        </a-space>
      </div>
    </div>

    <a-table
      :columns="columns"
      :data-source="records"
      :loading="loading"
      :pagination="false"
      row-key="id"
      :scroll="{ x: 'max-content' }"
    >
      <template #emptyText>
        <a-empty :image="Empty.PRESENTED_IMAGE_SIMPLE" :description="t('adminRoles.empty')" />
      </template>

      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'code'">
          <span class="mono">{{ record.code }}</span>
          <a-tag v-if="record.builtIn === 1" color="blue" class="row-tag">{{ t('adminRoles.builtIn') }}</a-tag>
        </template>
        <template v-else-if="column.key === 'name'">{{ record.name }}</template>
        <template v-else-if="column.key === 'description'">
          <span class="meta-text">{{ record.description || '-' }}</span>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-badge
            :status="record.status === 1 ? 'success' : 'default'"
            :text="record.status === 1 ? t('common.enabled') : t('common.disabled')"
          />
        </template>
        <template v-else-if="column.key === 'action'">
          <span class="cell-action">
            <a-button type="link" size="small" :disabled="!hasId(record)" @click="openEdit(record)">
              {{ t('common.edit') }}
            </a-button>
            <a-button
              type="link"
              size="small"
              :loading="actingId === record.id"
              :disabled="!hasId(record)"
              @click="handleStatus(record, record.status !== 1)"
            >
              {{ record.status === 1 ? t('common.disable') : t('common.enable') }}
            </a-button>
            <a-button
              type="link"
              size="small"
              danger
              :disabled="record.builtIn === 1 || !hasId(record)"
              @click="handleDelete(record)"
            >
              {{ t('common.delete') }}
            </a-button>
          </span>
        </template>
      </template>
    </a-table>
  </div>

  <a-modal
    v-model:open="addOpen"
    :title="t('adminRoles.addTitle')"
    :ok-text="t('adminRoles.addOk')"
    :confirm-loading="submitting"
    @ok="handleAdd"
  >
    <a-form layout="vertical">
      <a-form-item :label="t('adminRoles.codeLabel')" required>
        <a-input
          v-model:value="addForm.code"
          :placeholder="t('adminRoles.codePlaceholder')"
          :maxlength="32"
          allow-clear
        />
      </a-form-item>
      <a-form-item :label="t('adminRoles.nameLabel')" required>
        <a-input v-model:value="addForm.name" :maxlength="64" allow-clear />
      </a-form-item>
      <a-form-item :label="t('adminRoles.descriptionLabel')">
        <a-textarea v-model:value="addForm.description" :maxlength="255" :rows="2" show-count />
      </a-form-item>
      <a-alert type="info" show-icon :message="t('adminRoles.codeHint')" />
    </a-form>
  </a-modal>

  <a-modal
    v-model:open="editOpen"
    :title="t('adminRoles.editTitle')"
    :ok-text="t('adminRoles.editOk')"
    :confirm-loading="submitting"
    @ok="handleEdit"
  >
    <a-form layout="vertical">
      <a-form-item :label="t('adminRoles.codeLabel')" required>
        <a-input v-model:value="editForm.code" :maxlength="32" :disabled="editing?.builtIn === 1" />
      </a-form-item>
      <a-form-item :label="t('adminRoles.nameLabel')" required>
        <a-input v-model:value="editForm.name" :maxlength="64" allow-clear />
      </a-form-item>
      <a-form-item :label="t('adminRoles.descriptionLabel')">
        <a-textarea v-model:value="editForm.description" :maxlength="255" :rows="2" show-count />
      </a-form-item>
      <a-alert v-if="editing?.builtIn === 1" type="info" show-icon :message="t('adminRoles.builtInHint')" />
    </a-form>
  </a-modal>
</template>

<style scoped>
/* 工具栏 / 列设置样式在全局（assets/styles/index.css），三张后台页共用 */
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.row-tag {
  margin-inline-start: 6px;
}

.meta-text {
  font-size: 12px;
  color: var(--text-secondary);
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
