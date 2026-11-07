<script setup>
// 用户管理页：列表 / 添加（指定 SSO uid）/ 启停 / 软删除（移入回收站）
// 列表用 a-list（不使用 a-table）：加载中显示骨架屏，空数据显示 a-empty，分页靠右
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

/** 首屏骨架屏：只在没有数据可展示时出现，翻页时用居中的 a-spin 覆盖，避免闪烁 */
const showSkeleton = ref(false)

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
    <div v-if="showSkeleton" class="list-body">
      <a-skeleton active :title="false" :paragraph="{ rows: 8 }" />
    </div>

    <!-- 空数据 -->
    <a-empty v-else-if="!records.length" class="list-body" :description="t('adminUsers.empty')" />

    <!-- 列表（a-spin 居中覆盖翻页加载） -->
    <a-spin v-else :spinning="loading" :tip="t('common.loading')">
      <a-list :data-source="records" :split="true" item-layout="horizontal" class="user-list">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                <a-space wrap :size="8">
                  <span class="mono uid-text">{{ item.uid }}</span>
                  <a-tag v-if="isSelf(item)" color="blue">{{ t('adminUsers.me') }}</a-tag>
                  <a-tag :color="item.role === 'ADMIN' ? 'gold' : 'default'">{{ item.role }}</a-tag>
                </a-space>
              </template>
              <template #description>
                <a-space wrap :size="[16, 4]" class="meta-row">
                  <span class="meta-item">
                    {{ t('adminUsers.columns.id') }}：<span class="mono">{{ item.id }}</span>
                  </span>
                  <a-space :size="6">
                    <span class="meta-item">{{ t('adminUsers.columns.status') }}：</span>
                    <a-switch
                      size="small"
                      :checked="item.status === 1"
                      :disabled="isSelf(item)"
                      @change="(checked) => handleStatus(item, checked)"
                    />
                    <span :class="item.status === 1 ? 'status-on' : 'status-off'">
                      {{ item.status === 1 ? t('common.enabled') : t('common.disabled') }}
                    </span>
                  </a-space>
                  <span class="meta-item">
                    {{ t('adminUsers.columns.createTime') }}：<span class="mono">{{ item.createTime }}</span>
                  </span>
                </a-space>
              </template>
            </a-list-item-meta>
            <template #actions>
              <a-button type="link" size="small" danger :disabled="isSelf(item)" @click="handleDelete(item)">
                {{ t('common.delete') }}
              </a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>
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

/* 列表主体：骨架屏 / 空状态 / 列表 共用，保证切换时高度不塌 */
.list-body {
  min-height: 240px;
  padding: 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-body:has(.a-skeleton) {
  display: block;
}

.user-list {
  padding: 4px 0;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.uid-text {
  font-weight: 600;
}

.meta-row {
  color: var(--text-secondary);
}

.meta-item {
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

/* 移动端：列表操作换行、分页居中 */
@media (max-width: 575px) {
  .user-list :deep(.ant-list-item) {
    flex-direction: column;
    align-items: flex-start;
  }

  .user-list :deep(.ant-list-item-action) {
    margin-inline-start: 0;
    margin-top: 8px;
  }

  .pager {
    justify-content: center;
  }
}
</style>
