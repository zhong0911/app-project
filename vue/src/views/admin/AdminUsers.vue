<script setup>
// 用户管理页（表格样式）：UID / 角色 / 状态 / 上次登录时间 / 操作（编辑 · 停用启用 · 删除）
// 表格用 a-listy（antdv-next 的高性能虚拟列表）+ 表头 + 等宽栅格实现列对齐，
// 不使用 a-table（与项目既有偏好一致：列表类页面统一用 a-listy / a-list）。
// 行高由组件按 token 计算，因此每一行保持单行布局；加载中显示骨架屏，空数据显示 a-empty，分页靠右
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
        { value: 'ADMIN', label: `ADMIN` },
        { value: 'USER', label: `USER` },
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

/** 首屏骨架屏：没有数据可展示时出现，翻页时用居中的 a-spin 覆盖，避免闪烁 */
const showSkeleton = ref(false)

/** 虚拟列表行 key 与滚动容器高度（a-listy 的行高由组件内部计算，这里只给容器高度） */
const rowKey = (item) => item.id
const listHeight = 440

/** 当前登录管理员自身：禁止禁用/删除自己，避免把自己锁在后台外 */
const isSelf = (record) => record.uid === userStore.userInfo?.uid

const load = async () => {
  const isEmpty = records.value.length === 0
  loading.value = true
  showSkeleton.value = isEmpty
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
    showSkeleton.value = false
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

    <!-- 加载中：首屏骨架屏 -->
    <a-skeleton v-if="showSkeleton" active :title="false" :paragraph="{ rows: 8 }" />

    <!-- 空数据 -->
    <div v-else-if="!records.length" class="list-empty">
      <a-empty :description="t('adminUsers.empty')" />
    </div>

    <!-- 表格：表头 + a-listy 虚拟列表（同一套栅格列，保证列对齐） -->
    <a-spin v-else :spinning="loading" :tip="t('common.loading')">
      <div class="user-table">
        <div class="table-head user-grid">
          <span class="head-cell">{{ t('adminUsers.columns.uid') }}</span>
          <span class="head-cell">{{ t('adminUsers.columns.role') }}</span>
          <span class="head-cell">{{ t('adminUsers.columns.status') }}</span>
          <span class="head-cell">{{ t('adminUsers.lastLoginAt') }}</span>
          <span class="head-cell head-action">{{ t('adminUsers.columns.action') }}</span>
        </div>

        <a-listy
          :items="records"
          :row-key="rowKey"
          :height="listHeight"
          virtual
          class="user-listy"
        >
          <template #itemRender="record">
            <div class="user-grid user-row">
              <span class="cell-uid">
                <span class="mono uid-text" :title="record.uid">{{ record.uid }}</span>
                <a-tag v-if="isSelf(record)" color="blue" class="row-tag">{{ t('adminUsers.me') }}</a-tag>
              </span>

              <span class="cell-role">
                <a-tag :color="record.role === 'ADMIN' ? 'gold' : 'default'" class="row-tag">
                  {{ roleName(record.role) }}
                </a-tag>
              </span>

              <span class="cell-status">
                <a-tag :color="record.status === 1 ? 'success' : 'default'" class="row-tag">
                  {{ record.status === 1 ? t('common.enabled') : t('common.disabled') }}
                </a-tag>
              </span>

              <span class="cell-last-login meta-text mono">
                {{ record.lastLoginAt || t('adminUsers.neverLoggedIn') }}
              </span>

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
            </div>
          </template>
        </a-listy>
      </div>
    </a-spin>

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

/* 空状态占位：与列表高度接近，避免切页时高度跳动 */
.list-empty {
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 表格容器：表头 + 虚拟列表整体描边 */
.user-table {
  border: 1px solid var(--ant-color-border-secondary, rgba(5, 5, 5, 0.06));
  border-radius: 8px;
  overflow: hidden;
}

/* 表头：与数据行共用一套栅格列，保证列对齐 */
.table-head {
  height: 40px;
  padding: 0 12px;
  display: grid;
  align-items: center;
  background: var(--ant-color-fill-alter, rgba(0, 0, 0, 0.02));
  border-bottom: 1px solid var(--ant-color-border-secondary, rgba(5, 5, 5, 0.06));
}

.head-cell {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, rgba(0, 0, 0, 0.65));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.head-action {
  text-align: right;
}

/* 列宽统一：UID 自适应，其余固定宽度（窄屏用紧凑宽度，宽屏放开，保证任意宽度下 5 列都在） */
.user-grid {
  display: grid;
  grid-template-columns: minmax(70px, 1fr) 88px 78px 148px 150px;
  gap: 6px;
}

@media (min-width: 1200px) {
  .user-grid {
    grid-template-columns: minmax(0, 1fr) 130px 100px 180px 210px;
    gap: 8px;
  }
}

/* 数据行：单行布局（虚拟列表行高固定，内容不换行） */
.user-row {
  height: 100%;
  align-items: center;
  padding: 0 12px;
  overflow: hidden;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.uid-text {
  font-weight: 600;
  font-size: 13px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-uid {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

.row-tag {
  margin-inline-end: 0;
}

.meta-text {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-last-login {
  display: block;
}

.cell-action {
  display: flex;
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

/* 窄屏：列宽收紧（5 列都保留），操作列按钮间距收紧，分页居中 */
@media (max-width: 767px) {
  .user-row,
  .table-head {
    padding: 0 8px;
  }

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
