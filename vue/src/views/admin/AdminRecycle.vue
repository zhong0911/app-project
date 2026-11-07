<script setup>
// 回收站：展示软删除用户，支持恢复与彻底删除
// 列表用 a-listy（antdv-next 的高性能虚拟列表）：每行单行布局；
// 加载中显示骨架屏，空数据显示 a-empty，分页靠右
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

/** 虚拟列表行 key 与滚动容器高度 */
const rowKey = (item) => item.id
const listHeight = 440

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
    <a-skeleton v-if="showSkeleton" active :title="false" :paragraph="{ rows: 8 }" />

    <!-- 空数据 -->
    <div v-else-if="!records.length" class="list-empty">
      <a-empty :description="t('adminRecycle.empty')" />
    </div>

    <!-- 列表：a-listy 虚拟列表（每行单行布局） -->
    <a-spin v-else :spinning="loading" :tip="t('common.loading')">
      <a-listy
        :items="records"
        :row-key="rowKey"
        :height="listHeight"
        virtual
        class="recycle-listy"
      >
        <template #itemRender="record">
          <div class="recycle-row">
            <span class="mono uid-text" :title="record.uid">{{ record.uid }}</span>
            <a-tag :color="record.role === 'ADMIN' ? 'gold' : 'default'" class="row-tag">{{ record.role }}</a-tag>
            <span class="meta-text">#{{ record.id }}</span>
            <span class="meta-text time-text">{{ record.updateTime }}</span>
            <span class="row-space"></span>
            <a-button type="link" size="small" @click="handleRestore(record)">
              {{ t('adminRecycle.restore') }}
            </a-button>
            <a-button type="link" size="small" danger @click="handlePurge(record)">
              {{ t('adminRecycle.purge') }}
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
</template>

<style scoped>
.admin-card {
  border-radius: 12px;
}

.recycle-hint {
  margin-bottom: 16px;
}

/* 空状态占位：与列表高度接近，避免切页时高度跳动 */
.list-empty {
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recycle-listy {
  border: 1px solid var(--ant-color-border-secondary, rgba(5, 5, 5, 0.06));
  border-radius: 8px;
  overflow: hidden;
}

/* 行内单行布局：虚拟列表行高固定，内容不换行 */
.recycle-row {
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

  .recycle-row {
    gap: 6px;
  }

  .pager {
    justify-content: center;
  }
}
</style>
