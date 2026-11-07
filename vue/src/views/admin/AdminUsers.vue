<script setup>
// 用户管理页：列表 / 添加（指定 SSO uid）/ 启停 / 软删除（移入回收站）
// 列表用 a-listy（antdv-next 的高性能虚拟列表，无 a-list/a-table）：
// 行高由组件按 token 计算，因此每一行保持单行布局；加载中显示骨架屏，空数据显示 a-empty，分页靠右
import { onMounted, reactive, ref } from 'vue'
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

/** 首屏骨架屏：没有数据可展示时出现，翻页时用居中的 a-spin 覆盖，避免闪烁 */
const showSkeleton = ref(false)

/** 虚拟列表行 key 与高度（a-listy 的行高由组件内部计算，这里只给滚动容器高度） */
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

const handleSearch = () => {
  pageNum.value = 1
  load()
}

const handleReset = () => {
  filters.uid = ''
  filters.status = undefined
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

const handleStatus = async (record, checked) => {
  try {
    await updateAdminUserStatusApi(record.id, checked ? 1 : 0)
    message.success(t(checked ? 'adminUsers.enableSuccess' : 'adminUsers.disableSuccess'))
    await load()
  } catch {
    // 失败时重新拉取，保证开关状态与后端一致
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

onMounted(load)
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

    <!-- 加载中：首屏骨架屏 -->
    <a-skeleton v-if="showSkeleton" active :title="false" :paragraph="{ rows: 8 }" />

    <!-- 空数据 -->
    <div v-else-if="!records.length" class="list-empty">
      <a-empty :description="t('adminUsers.empty')" />
    </div>

    <!-- 列表：a-listy 虚拟列表（每行单行布局，行高由组件计算） -->
    <a-spin v-else :spinning="loading" :tip="t('common.loading')">
      <a-listy
        :items="records"
        :row-key="rowKey"
        :height="listHeight"
        virtual
        class="user-listy"
      >
        <template #itemRender="record">
          <div class="user-row">
            <span class="mono uid-text" :title="record.uid">{{ record.uid }}</span>
            <a-tag v-if="isSelf(record)" color="blue" class="row-tag">{{ t('adminUsers.me') }}</a-tag>
            <a-tag :color="record.role === 'ADMIN' ? 'gold' : 'default'" class="row-tag">{{ record.role }}</a-tag>
            <span class="meta-text">#{{ record.id }}</span>
            <span class="meta-text time-text">{{ record.createTime }}</span>
            <span class="row-space"></span>
            <a-switch
              size="small"
              :checked="record.status === 1"
              :disabled="isSelf(record)"
              @change="(checked) => handleStatus(record, checked)"
            />
            <span :class="['status-text', record.status === 1 ? 'status-on' : 'status-off']">
              {{ record.status === 1 ? t('common.enabled') : t('common.disabled') }}
            </span>
            <a-button type="link" size="small" danger :disabled="isSelf(record)" @click="handleDelete(record)">
              {{ t('common.delete') }}
            </a-button>
          </div>
        </template>
      </a-listy>
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

.user-listy {
  border: 1px solid var(--ant-color-border-secondary, rgba(5, 5, 5, 0.06));
  border-radius: 8px;
  overflow: hidden;
}

/* 行内单行布局：虚拟列表行高固定，内容不换行，超出省略 */
.user-row {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.uid-text {
  font-weight: 600;
  font-size: 13px;
  max-width: 180px;
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

.time-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.row-space {
  flex: 1;
}

.status-text {
  font-size: 12px;
  white-space: nowrap;
}

.status-on {
  color: #52c41a;
}

.status-off {
  color: var(--text-tertiary);
}

/* 分页靠右对齐 */
.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

/* 移动端：隐藏时间列、行内更紧凑、分页居中 */
@media (max-width: 575px) {
  .time-text {
    display: none;
  }

  .user-row {
    gap: 6px;
  }

  .pager {
    justify-content: center;
  }
}
</style>
