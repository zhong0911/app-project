<script setup>
// 显示列选择器：后台表格统一的「列设置」入口
// - 选择结果按 storageKey 缓存到 localStorage（antx.columns.<storageKey>），刷新/重进页面保持
// - 头部提供「全选」与「恢复默认」，恢复默认会清掉该表格的缓存
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SettingOutlined } from '@antdv-next/icons'

const props = defineProps({
  /** 表格列定义（title 可以是字符串或函数，取 title 文本做复选框标签） */
  columns: { type: Array, default: () => [] },
  /** 当前显示的列 key 列表（v-model） */
  modelValue: { type: Array, default: () => [] },
  /** 缓存键：同一页面里有多个表格时各传不同 key */
  storageKey: { type: String, default: '' },
  /** 不允许隐藏的列（如操作列），取消勾选后自动补回 */
  lockedKeys: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const LS_PREFIX = 'antx.columns.'
const open = ref(false)

const allKeys = computed(() => props.columns.map((col) => col.key).filter(Boolean))

const options = computed(() =>
  props.columns
    .filter((col) => col.key)
    .map((col) => ({
      label: typeof col.title === 'string' ? col.title : String(col.title || col.key),
      value: col.key,
      disabled: props.lockedKeys.includes(col.key),
    })),
)

/** 锁定列始终保留：按列声明顺序重排，保证列顺序稳定 */
const normalize = (keys) => {
  const list = allKeys.value.filter((key) => keys.includes(key))
  props.lockedKeys.forEach((key) => {
    if (allKeys.value.includes(key) && !list.includes(key)) {
      list.push(key)
    }
  })
  return list
}

const value = computed({
  get: () => props.modelValue,
  set: (next) => emit('update:modelValue', normalize(next || [])),
})

const selectAll = () => emit('update:modelValue', [...allKeys.value])

const resetDefault = () => {
  if (props.storageKey) {
    localStorage.removeItem(LS_PREFIX + props.storageKey)
  }
  emit('update:modelValue', [...allKeys.value])
}

onMounted(() => {
  if (!props.storageKey) {
    return
  }
  try {
    const saved = JSON.parse(localStorage.getItem(LS_PREFIX + props.storageKey) || 'null')
    if (Array.isArray(saved) && saved.length) {
      const valid = saved.filter((key) => allKeys.value.includes(key))
      if (valid.length) {
        emit('update:modelValue', normalize(valid))
      }
    }
  } catch {
    // 缓存坏了就当没存过，回落到默认列
  }
})

watch(
  () => props.modelValue,
  (next) => {
    if (!props.storageKey) {
      return
    }
    localStorage.setItem(LS_PREFIX + props.storageKey, JSON.stringify(next || []))
  },
  { deep: true },
)
</script>

<template>
  <a-popover v-model:open="open" trigger="click" placement="bottomRight">
    <template #content>
      <div class="column-picker">
        <div class="column-picker-head">
          <span class="column-picker-title">{{ t('common.columnSetting') }}</span>
          <a-space :size="4">
            <a-button type="link" size="small" @click="selectAll">{{ t('common.selectAll') }}</a-button>
            <a-button type="link" size="small" @click="resetDefault">{{ t('common.resetDefault') }}</a-button>
          </a-space>
        </div>
        <a-checkbox-group v-model:value="value" :options="options" class="column-picker-list" />
      </div>
    </template>
    <a-button>
      <SettingOutlined />
    </a-button>
  </a-popover>
</template>

<style scoped>
.column-picker {
  width: 260px;
  max-height: 320px;
  overflow: auto;
}

.column-picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.column-picker-title {
  font-weight: 500;
}

.column-picker-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
}
</style>
