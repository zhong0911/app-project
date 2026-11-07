<script setup>
// 回收站：展示软删除用户，支持恢复与彻底删除
// 列表用 a-list（不使用 a-table）：加载中显示骨架屏，空数据显示 a-empty，分页靠右
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ReloadOutlined } from '@antdv-next/icons'
import { message, modal } from '@/utils/app'
import { getAdminRecycleApi, purgeAdminUserApi, restoreAdminUserApi } from '@/api/admin'

const { t } = useI18n()

const loading = ref(false)
const records = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const filters = reactive({ uid: '' })

/** 首屏骨架屏：没有数据可展示时出现，翻页时用居中的 a-spin 覆盖 */
const showSkeleton = ref(false)

const load = async () => {
  const isEmpty = records.value.length === 0
  loading.value = true
  showSkeleton.value = isEmpty
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
    showSkeleton.value = false
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
      <a-space wrap>
        <a-input
          v-model:value="filters.uid"
          :placeholder="t('adminRecycle.searchUid')"
          allow-clear
          style="width: 180px"
          @press-enter="handleSearch"
        />
        <a-button type="primary" @click="handleSearch">
          <ReloadOutlined />
          {{ t('common.query') }}
        </a-button>
      </a-space>
    </template>

    <a-alert type="info" show-icon :message="t('adminRecycle.hint')" class="recycle-hint" />

    <!-- 加载中：首屏骨架屏 -->
    <div v-if="showSkeleton" class="list-body">
      <a-skeleton active :title="false" :paragraph="{ rows: 8 }" />
    </div>

    <!-- 空数据 -->
    <a-empty v-else-if="!records.length" class="list-body" :description="t('adminRecycle.empty')" />

    <!-- 列表（a-spin 居中覆盖翻页加载） -->
    <a-spin v-else :spinning="loading" :tip="t('common.loading')">
      <a-list :data-source="records" :split="true" item-layout="horizontal" class="recycle-list">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                <a-space wrap :size="8">
                  <span class="mono uid-text">{{ item.uid }}</span>
                  <a-tag :color="item.role === 'ADMIN' ? 'gold' : 'default'">{{ item.role }}</a-tag>
                </a-space>
              </template>
              <template #description>
                <a-space wrap :size="[16, 4]" class="meta-row">
                  <span class="meta-item">
                    {{ t('adminRecycle.columns.id') }}：<span class="mono">{{ item.id }}</span>
                  </span>
                  <span class="meta-item">
                    {{ t('adminRecycle.columns.deletedAt') }}：<span class="mono">{{ item.updateTime }}</span>
                  </span>
                </a-space>
              </template>
            </a-list-item-meta>
            <template #actions>
              <a-space :size="4">
                <a-button type="link" size="small" @click="handleRestore(item)">
                  {{ t('adminRecycle.restore') }}
                </a-button>
                <a-button type="link" size="small" danger @click="handlePurge(item)">
                  {{ t('adminRecycle.purge') }}
                </a-button>
              </a-space>
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
</template>

<style scoped>
.admin-card {
  border-radius: 12px;
}

.recycle-hint {
  margin-bottom: 16px;
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

.recycle-list {
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

/* 分页靠右对齐 */
.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

/* 移动端：列表操作换行、分页居中 */
@media (max-width: 575px) {
  .recycle-list :deep(.ant-list-item) {
    flex-direction: column;
    align-items: flex-start;
  }

  .recycle-list :deep(.ant-list-item-action) {
    margin-inline-start: 0;
    margin-top: 8px;
  }

  .pager {
    justify-content: center;
  }
}
</style>
