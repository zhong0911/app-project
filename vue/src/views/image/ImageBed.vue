<script setup>
// 图床页：拖拽/批量上传、Ctrl+V 粘贴上传、缩略图列表、复制直链/Markdown/HTML、回收站恢复与彻底删除
// 图片直链由后端按 uuid 生成（同内容 sha256 命中时自动复用已有链接）
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { LOCALES, localeKey, setLocale } from '@/config/locale'
import { ACCOUNT_CENTER_URL } from '@/config/app'
import { useAppStore } from '@/stores/modules/app'
import { useUserStore } from '@/stores/modules/user'
import {
  CopyOutlined,
  DashboardOutlined,
  DeleteOutlined,
  GlobalOutlined,
  InboxOutlined,
  LogoutOutlined,
  MoonOutlined,
  ReloadOutlined,
  SunOutlined,
  UndoOutlined,
  UploadOutlined,
  UserOutlined,
} from '@antdv-next/icons'
import { message, modal } from '@/utils/app'
import {
  deleteImageApi,
  getImageRecycleApi,
  getImagesApi,
  purgeImageApi,
  restoreImageApi,
  uploadImageApi,
} from '@/api/image'

const { t } = useI18n()

// 图床页不再套布局，原先由布局承担的登录态与应用级开关收在页面卡片右上角
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

const userMenuItems = computed(() => [
  { key: 'account', label: t('common.accountCenter'), icon: UserOutlined },
  { key: 'logout', label: t('common.logout'), icon: LogoutOutlined },
])

const handleLocaleChange = ({ key }) => setLocale(key)

const handleUserMenu = ({ key }) => {
  if (key === 'account') {
    // 账号中心在 SSO（passport.antx.cc）侧，新标签打开
    window.open(ACCOUNT_CENTER_URL, '_blank', 'noopener')
    return
  }
  router.push('/logout')
}

/** 控制台入口：只有管理员可见（isAdmin 由后端按 SSO_ADMIN_UID 判定并下发） */
const goConsole = () => router.push('/admin/users')

/** 单图上限（与后端 IMAGE_MAX_SIZE 保持一致，后端仍会二次校验） */
const MAX_SIZE = 10 * 1024 * 1024
const ALLOW_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/avif']

const tab = ref('mine')
const tabOptions = computed(() => [
  { value: 'mine', label: t('imageBed.tabMine') },
  { value: 'recycle', label: t('imageBed.tabRecycle') },
])

const loading = ref(false)
const records = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const keyword = ref('')

/** 正在上传的任务数（>0 时上传入口显示 loading） */
const uploadingCount = ref(0)
const uploading = computed(() => uploadingCount.value > 0)

const isRecycle = computed(() => tab.value === 'recycle')

const columns = computed(() => {
  const base = [
    { title: t('imageBed.columns.preview'), key: 'preview', width: 96 },
    { title: t('imageBed.columns.name'), dataIndex: 'originName', key: 'originName', ellipsis: true },
    { title: t('imageBed.columns.size'), key: 'size', width: 100 },
    { title: t('imageBed.columns.dimension'), key: 'dimension', width: 120 },
  ]
  if (!isRecycle.value) {
    base.push({ title: t('imageBed.columns.visits'), dataIndex: 'visitCount', key: 'visitCount', width: 90 })
  }
  base.push({ title: t('imageBed.columns.createTime'), dataIndex: 'createTime', key: 'createTime', width: 170 })
  base.push({ title: t('imageBed.columns.action'), key: 'action', width: isRecycle.value ? 150 : 210 })
  return base
})

/** 表格自带分页，靠右对齐 */
const pagination = computed(() => ({
  current: pageNum.value,
  pageSize: pageSize.value,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count) => t('common.total', { total: count }),
  position: ['bottomRight'],
}))

const formatSize = (bytes) => {
  const size = Number(bytes) || 0
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1048576).toFixed(2)} MB`
}

const dimension = (record) =>
  record.width && record.height ? `${record.width} × ${record.height}` : t('imageBed.unknownSize')

const load = async () => {
  loading.value = true
  try {
    const api = isRecycle.value ? getImageRecycleApi : getImagesApi
    const { data } = await api({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
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

const handleSearch = () => {
  pageNum.value = 1
  load()
}

const handleTableChange = (pag) => {
  pageNum.value = pag.current
  pageSize.value = pag.pageSize
  load()
}

const handleTabChange = () => {
  pageNum.value = 1
  records.value = []
  total.value = 0
  load()
}

/** 复制文本：优先 Clipboard API，失败回退到临时 textarea（兼容非 https 内网环境） */
const copyText = async (text, successText = null) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    message.success(successText || t('imageBed.copied'))
  } catch {
    message.error(t('imageBed.copyFailed'))
  }
}

const copyMarkdown = (record) => copyText(`![${record.originName || record.uuid}](${record.url})`)
const copyHtml = (record) =>
  copyText(`<img src="${record.url}" alt="${record.originName || record.uuid}" />`)

/** 行内「更多」菜单：复制 HTML / 新窗口打开原图 */
const handleMore = ({ key }, record) => {
  if (key === 'html') {
    copyHtml(record)
    return
  }
  window.open(record.url, '_blank', 'noopener')
}

/** 前端预校验：只挡明显问题，最终以服务端判定为准 */
const validateFile = (file) => {
  if (file.size > MAX_SIZE) {
    message.warning(t('imageBed.sizeLimit', { size: MAX_SIZE / 1048576 }))
    return false
  }
  if (file.type && !ALLOW_MIME.includes(file.type)) {
    message.warning(t('imageBed.typeLimit'))
    return false
  }
  return true
}

/** 上传成功的链接延迟合并复制：批量上传时只复制最后一次成功的链接，避免多条提示 */
let copyTimer = null
let lastUploadedUrl = ''
const queueCopy = (url) => {
  lastUploadedUrl = url
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    if (lastUploadedUrl) copyText(lastUploadedUrl, t('imageBed.copySuccess'))
  }, 300)
}

const handleResult = async (res) => {
  const image = res?.data?.image
  if (!image) return
  message.success(res.data.dedup ? t('imageBed.uploadDedup') : t('imageBed.uploadSuccess'))
  // 上传即复制直链，省掉一次手动操作
  queueCopy(image.url)
  if (isRecycle.value) {
    tab.value = 'mine'
    handleTabChange()
    return
  }
  pageNum.value = 1
  await load()
}

/** 统一上传入口：拖拽 / 选择 / 粘贴共用；onFinish 用于回传 a-upload 的完成回调 */
const uploadOne = async (file, onFinish = null) => {
  if (!validateFile(file)) {
    onFinish?.()
    return
  }
  uploadingCount.value += 1
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await uploadImageApi(formData)
    await handleResult(res)
  } catch {
    // 失败提示由 axios 拦截器统一处理
  } finally {
    uploadingCount.value -= 1
    onFinish?.()
  }
}

/** a-upload 自定义上传（走统一 axios 实例，带登录态与错误提示） */
const handleUpload = ({ file, onSuccess }) => {
  uploadOne(file, () => onSuccess?.({}, file))
}

const beforeUpload = (file) => {
  if (!validateFile(file)) return false
  return true
}

/** 隐藏的原生 file 选择框：供顶部「上传图片」按钮触发（支持多选） */
const fileInput = ref(null)
const openPicker = () => {
  if (!uploading.value) fileInput.value?.click()
}

const handleFilePick = (event) => {
  const files = Array.from(event.target.files || [])
  files.forEach((file) => uploadOne(file))
  // 清空 value，保证连续选择同一张图片也能触发 change
  event.target.value = ''
}

/** 粘贴上传：截图后直接在页面 Ctrl+V */
const handlePaste = (event) => {
  const items = event.clipboardData?.items || []
  const files = []
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (!files.length) return
  event.preventDefault()
  files.forEach((file) => uploadOne(file))
}

const handleDelete = (record) => {
  modal.confirm({
    title: t('imageBed.deleteTitle'),
    content: t('imageBed.deleteConfirm', { name: record.originName || record.uuid }),
    okText: t('imageBed.deleteOk'),
    okButtonProps: { danger: true },
    onOk: async () => {
      await deleteImageApi(record.uuid)
      message.success(t('imageBed.deleteSuccess'))
      if (records.value.length === 1 && pageNum.value > 1) pageNum.value -= 1
      await load()
    },
  })
}

const handleRestore = async (record) => {
  await restoreImageApi(record.uuid)
  message.success(t('imageBed.restoreSuccess'))
  if (records.value.length === 1 && pageNum.value > 1) pageNum.value -= 1
  await load()
}

const handlePurge = (record) => {
  modal.confirm({
    title: t('imageBed.purgeTitle'),
    content: t('imageBed.purgeConfirm', { name: record.originName || record.uuid }),
    okText: t('imageBed.purgeOk'),
    okButtonProps: { danger: true },
    onOk: async () => {
      await purgeImageApi(record.uuid)
      message.success(t('imageBed.purgeSuccess'))
      if (records.value.length === 1 && pageNum.value > 1) pageNum.value -= 1
      await load()
    },
  })
}

onMounted(async () => {
  // 登录态与回跳恢复原由布局负责，页面独立后在这里补上
  await userStore.fetchLoginUser()
  const redirect = userStore.readRedirectUri()
  if (redirect && userStore.isLoggedIn) {
    userStore.clearRedirectUri()
    userStore.markLoggedIn()
    router.replace(redirect)
  }
  load()
  window.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  window.removeEventListener('paste', handlePaste)
  if (copyTimer) clearTimeout(copyTimer)
})
</script>

<template>
  <div class="tool-page-card">
    <a-card variant="borderless" class="image-card">
      <template #title>{{ t('imageBed.title') }}</template>
      <template #extra>
        <a-space wrap>
          <a-input
            v-model:value="keyword"
            :placeholder="t('imageBed.searchPlaceholder')"
            allow-clear
            style="width: 200px"
            @press-enter="handleSearch"
          />
          <a-button type="primary" @click="handleSearch">
            <ReloadOutlined />
            {{ t('common.refresh') }}
          </a-button>
          <a-button type="primary" :loading="uploading" @click="openPicker">
            <UploadOutlined />
            {{ t('imageBed.upload') }}
          </a-button>
          <!-- 页面级开关：语言 / 主题 / 用户 / 控制台（右起第一个即管理员入口） -->
          <a-dropdown
            :trigger="['click']"
            :menu="{
              items: LOCALES.map((l) => ({ key: l.key, label: l.label })),
              selectable: true,
              selectedKeys: [localeKey],
            }"
            @menu-click="handleLocaleChange"
          >
            <a-button type="text" shape="circle" class="icon-btn">
              <GlobalOutlined />
            </a-button>
          </a-dropdown>
          <a-button type="text" shape="circle" class="icon-btn" @click="appStore.toggleDark()">
            <component :is="appStore.isDark ? SunOutlined : MoonOutlined" />
          </a-button>
          <a-button
            v-if="!userStore.isLoggedIn"
            type="primary"
            @click="router.push('/login')"
          >
            {{ t('common.login') }}
          </a-button>
          <a-dropdown v-else :trigger="['click']" :menu="{ items: userMenuItems }" @menu-click="handleUserMenu">
            <a-button type="text" shape="circle" class="icon-btn">
              <UserOutlined />
            </a-button>
          </a-dropdown>
          <a-tooltip v-if="userStore.isAdmin" :title="t('common.console')">
            <a-button type="text" shape="circle" class="icon-btn console-btn" @click="goConsole">
              <DashboardOutlined />
            </a-button>
          </a-tooltip>
        </a-space>
      </template>

      <!-- 隐藏的原生文件选择框（支持多选） -->
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/avif"
        multiple
        class="hidden-input"
        @change="handleFilePick"
      />

      <!-- 上传落区：拖拽 / 点击 / 粘贴 三种入口都落在这里 -->
      <a-upload-dragger
        :multiple="true"
        :show-upload-list="false"
        :before-upload="beforeUpload"
        :custom-request="handleUpload"
        :disabled="uploading"
        class="drop-zone"
      >
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">{{ t('imageBed.dropTitle') }}</p>
        <p class="ant-upload-hint">{{ t('imageBed.dropHint') }}</p>
      </a-upload-dragger>

      <div class="tabs-row">
        <a-radio-group v-model:value="tab" button-style="solid" @change="handleTabChange">
          <a-radio-button v-for="item in tabOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </a-radio-button>
        </a-radio-group>
        <span v-if="isRecycle" class="recycle-hint">{{ t('imageBed.recycleHint') }}</span>
      </div>

      <a-table
        :columns="columns"
        :data-source="records"
        :loading="loading"
        :pagination="pagination"
        row-key="uuid"
        :scroll="{ x: 900 }"
        @change="handleTableChange"
      >
        <template #emptyText>
          <a-empty :description="isRecycle ? t('imageBed.recycleEmpty') : t('imageBed.empty')" />
        </template>

        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'preview'">
            <a-image :src="record.url" :width="64" :height="48" class="thumb" />
          </template>

          <template v-else-if="column.key === 'originName'">
            <span class="name-text" :title="record.originName">{{ record.originName || record.uuid }}</span>
          </template>

          <template v-else-if="column.key === 'size'">
            <span class="meta-text mono">{{ formatSize(record.size) }}</span>
          </template>

          <template v-else-if="column.key === 'dimension'">
            <span class="meta-text mono">{{ dimension(record) }}</span>
          </template>

          <template v-else-if="column.key === 'visitCount'">
            <span class="meta-text mono">{{ record.visitCount }}</span>
          </template>

          <template v-else-if="column.key === 'createTime'">
            <span class="meta-text mono">{{ record.createTime || '—' }}</span>
          </template>

          <template v-else-if="column.key === 'action'">
            <span class="cell-action">
              <template v-if="!isRecycle">
                <a-button type="link" size="small" @click="copyText(record.url)">
                  <CopyOutlined />
                  {{ t('imageBed.copyLink') }}
                </a-button>
                <a-button type="link" size="small" @click="copyMarkdown(record)">
                  {{ t('imageBed.copyMarkdown') }}
                </a-button>
                <a-dropdown :trigger="['click']">
                  <a-button type="link" size="small">{{ t('imageBed.more') }}</a-button>
                  <template #overlay>
                    <a-menu
                      :items="[
                        { key: 'html', label: t('imageBed.copyHtml') },
                        { key: 'open', label: t('imageBed.openImage') },
                      ]"
                      @click="handleMore($event, record)"
                    />
                  </template>
                </a-dropdown>
                <a-button type="link" size="small" danger @click="handleDelete(record)">
                  <DeleteOutlined />
                  {{ t('common.delete') }}
                </a-button>
              </template>
              <template v-else>
                <a-button type="link" size="small" @click="handleRestore(record)">
                  <UndoOutlined />
                  {{ t('common.restore') }}
                </a-button>
                <a-button type="link" size="small" danger @click="handlePurge(record)">
                  {{ t('common.purge') }}
                </a-button>
              </template>
            </span>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
/* 页面独立后自行负责外边距（原先由布局的内容区提供） */
.tool-page-card {
  width: 100%;
  min-height: 100svh;
  padding: 16px 24px 24px;
  box-sizing: border-box;
}

/* 页面右上角的小圆按钮：语言 / 主题 / 用户 / 控制台 */
.icon-btn {
  flex: none;
  width: 32px;
  height: 32px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.image-card {
  border-radius: 12px;
}

.image-card :deep(.ant-card-head) {
  padding-inline: 20px;
}

.hidden-input {
  display: none;
}

.drop-zone {
  margin-bottom: 16px;
}

.drop-zone :deep(.ant-upload-drag) {
  border-radius: 12px;
}

.drop-zone :deep(.ant-upload-drag-icon) {
  margin-bottom: 8px;
}

.drop-zone :deep(.ant-upload-drag-icon .anticon) {
  font-size: 34px;
}

.tabs-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.recycle-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.meta-text {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.name-text {
  font-weight: 600;
  font-size: 13px;
}

.thumb {
  border-radius: 6px;
}

.thumb :deep(.ant-image-img) {
  object-fit: cover;
  border-radius: 6px;
}

.cell-action {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}

/* 窄屏：操作列文字按钮收紧，避免换行 */
@media (max-width: 767px) {
  .tool-page-card {
    padding: 8px 12px 16px;
  }

  .image-card :deep(.ant-card-head) {
    padding-inline: 12px;
  }

  .cell-action {
    gap: 0;
  }

  .cell-action :deep(.ant-btn-link) {
    padding-inline: 4px;
  }
}
</style>
