import dayjs from 'dayjs'

/** 应用/部署状态 → 标签颜色；文案走 i18n：paas.status.<status> */
export const STATUS_COLORS = {
  running: 'green',
  building: 'blue',
  deploying: 'cyan',
  queued: 'default',
  created: 'default',
  stopped: 'default',
  failed: 'red',
}

export function statusColor(status) {
  return STATUS_COLORS[status] || 'default'
}

export function formatTime(value, pattern = 'YYYY-MM-DD HH:mm:ss') {
  if (!value) return '-'
  return dayjs(value).format(pattern)
}

export function fromNow(value) {
  if (!value) return '-'
  return dayjs(value).fromNow?.() || dayjs(value).format('MM-DD HH:mm')
}

/** 环境变量对象 → [{key,value}]，便于表格编辑 */
export function envToRows(env = {}) {
  return Object.entries(env).map(([key, value]) => ({ key, value: String(value) }))
}

export function rowsToEnv(rows = []) {
  const env = {}
  for (const row of rows) {
    if (!row?.key) continue
    env[row.key] = row.value ?? ''
  }
  return env
}

/** 计算内存使用百分比 */
export function memoryPercent(stats) {
  if (!stats?.memoryLimitMb) return 0
  return Math.min(100, Math.round((stats.memoryMb / stats.memoryLimitMb) * 100))
}
