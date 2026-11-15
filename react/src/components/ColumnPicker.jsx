import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Checkbox, Popover, Space } from 'antd'
import { SettingOutlined } from '@ant-design/icons'

/**
 * 显示列选择器：后台表格统一的「列设置」入口
 *
 * - 选择结果按 storageKey 缓存到 localStorage（antx.columns.<storageKey>），刷新/重进页面保持
 * - 头部提供「全选」与「恢复默认」，恢复默认会清掉该表格的缓存
 */
const LS_PREFIX = 'antx.columns.'

export default function ColumnPicker({ columns = [], value = [], onChange, storageKey = '', lockedKeys = [] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const allKeys = useMemo(() => columns.map((col) => col.key).filter(Boolean), [columns])

  const options = useMemo(
    () =>
      columns
        .filter((col) => col.key)
        .map((col) => ({
          label: typeof col.title === 'string' ? col.title : String(col.title || col.key),
          value: col.key,
          disabled: lockedKeys.includes(col.key),
        })),
    [columns, lockedKeys],
  )

  /** 锁定列始终保留：按列声明顺序重排，保证列顺序稳定 */
  const normalize = (keys) => {
    const list = allKeys.filter((key) => keys.includes(key))
    lockedKeys.forEach((key) => {
      if (allKeys.includes(key) && !list.includes(key)) {
        list.push(key)
      }
    })
    return list
  }

  const handleChange = (keys) => {
    onChange?.(normalize(keys || []))
  }

  const selectAll = () => {
    onChange?.([...allKeys])
  }

  const resetDefault = () => {
    if (storageKey) {
      localStorage.removeItem(LS_PREFIX + storageKey)
    }
    onChange?.([...allKeys])
  }

  // 进入页面时按缓存恢复（只认还在当前列定义里的 key）
  useEffect(() => {
    if (!storageKey) {
      return
    }
    try {
      const saved = JSON.parse(localStorage.getItem(LS_PREFIX + storageKey) || 'null')
      if (Array.isArray(saved) && saved.length) {
        const valid = saved.filter((key) => allKeys.includes(key))
        if (valid.length) {
          onChange?.(normalize(valid))
        }
      }
    } catch {
      // 缓存坏了就当没存过，回落到默认列
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // 选择变化后写回缓存
  useEffect(() => {
    if (!storageKey) {
      return
    }
    localStorage.setItem(LS_PREFIX + storageKey, JSON.stringify(value || []))
  }, [value, storageKey])

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      content={
        <div className="column-picker">
          <div className="column-picker-head">
            <span className="column-picker-title">{t('common.columnSetting')}</span>
            <Space size={4}>
              <Button type="link" size="small" onClick={selectAll}>
                {t('common.selectAll')}
              </Button>
              <Button type="link" size="small" onClick={resetDefault}>
                {t('common.resetDefault')}
              </Button>
            </Space>
          </div>
          <Checkbox.Group value={value} options={options} onChange={handleChange} className="column-picker-list" />
        </div>
      }
    >
      <Button icon={<SettingOutlined />} />
    </Popover>
  )
}
