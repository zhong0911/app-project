<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  lines: { type: Array, default: () => [] },
  height: { type: String, default: '420px' },
})

const boxRef = ref(null)

/** 新日志到达时自动滚到底部 */
watch(
  () => props.lines.length,
  async () => {
    await nextTick()
    const el = boxRef.value
    if (el) el.scrollTop = el.scrollHeight
  },
)
</script>

<template>
  <div ref="boxRef" class="terminal" :style="{ height }">
    <div v-if="!lines.length" class="terminal-empty">暂无日志输出</div>
    <div v-for="(line, index) in lines" :key="index" class="terminal-line">{{ line }}</div>
  </div>
</template>

<style scoped>
.terminal {
  width: 100%;
  overflow: auto;
  background: #0f1117;
  color: #d6deeb;
  border-radius: 8px;
  padding: 12px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
}

.terminal-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-empty {
  color: #6b7280;
}

/* 极细滚动条，避免亮色主题下突兀 */
.terminal::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.terminal::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 4px;
}
</style>
