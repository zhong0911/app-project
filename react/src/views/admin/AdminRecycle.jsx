import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Empty, Table, Tabs, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'

import { getAdminRecycleApi, purgeAdminUserApi, restoreAdminUserApi } from '@/api/admin'
import { message, modal } from '@/utils/app'
import { usePageTitle } from '@/utils/useTitle'

/**
 * 回收站
 *
 * 按资源类型分 tab 展示软删除数据，当前只实现「用户」回收站；
 * 角色 / 部门等其他类型的 tab 预留，等有对应数据再补，避免空壳 tab。
 */
export default function AdminRecycle() {
  const { t } = useTranslation()

  usePageTitle(t('nav.adminRecycle'))

  /** 当前 tab：默认用户回收站；后续新增类型时在此切换对应数据源 */
  const [activeTab, setActiveTab] = useState('users')

  const [query, setQuery] = useState({ pageNum: 1, pageSize: 10 })

  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const { data } = await getAdminRecycleApi({
          pageNum: query.pageNum,
          pageSize: query.pageSize,
        })
        if (cancelled) return
        setRecords(data.records || [])
        setTotal(data.total || 0)
      } catch {
        if (cancelled) return
        setRecords([])
        setTotal(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [query])

  const refresh = () => setQuery((q) => ({ ...q, _t: Date.now() }))

  const reloadAfterRemove = () =>
    setQuery((q) =>
      records.length === 1 && q.pageNum > 1 ? { ...q, pageNum: q.pageNum - 1 } : { ...q, _t: Date.now() },
    )

  /** 刷新列表（回收站不再提供条件筛选，回到第一页重拉） */
  const handleRefresh = () => setQuery((q) => ({ ...q, pageNum: 1, _t: Date.now() }))

  const handleTableChange = (pag) => {
    setQuery((q) => ({ ...q, pageNum: pag.current, pageSize: pag.pageSize }))
  }

  /* ---------------- 恢复 / 彻底删除 ---------------- */
  const handleRestore = (record) => {
    modal.confirm({
      title: t('adminRecycle.restoreTitle'),
      content: t('adminRecycle.restoreConfirm', { uid: record.uid }),
      okText: t('adminRecycle.restore'),
      onOk: async () => {
        await restoreAdminUserApi(record.id)
        message.success(t('adminRecycle.restoreSuccess'))
        reloadAfterRemove()
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
        reloadAfterRemove()
      },
    })
  }

  const columns = [
    {
      title: t('adminRecycle.columns.uid'),
      dataIndex: 'uid',
      key: 'uid',
      ellipsis: true,
      render: (value, record) => (
        <span className="mono uid-text" title={record.uid}>
          {record.uid}
        </span>
      ),
    },
    {
      title: t('adminRecycle.columns.role'),
      dataIndex: 'role',
      key: 'role',
      render: (value) => (
        <Tag color={value === 'ADMIN' ? 'gold' : 'default'} className="row-tag">
          {value}
        </Tag>
      ),
    },
    {
      title: t('adminRecycle.columns.id'),
      dataIndex: 'id',
      key: 'id',
      render: (value) => <span className="meta-text mono">#{value}</span>,
    },
    {
      title: t('adminRecycle.columns.deletedAt'),
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 170,
      render: (value) => <span className="meta-text mono">{value}</span>,
    },
    {
      title: t('adminRecycle.columns.action'),
      key: 'action',
      width: 150,
      render: (_, record) => (
        <span className="cell-action">
          <Button type="link" size="small" onClick={() => handleRestore(record)}>
            {t('adminRecycle.restore')}
          </Button>
          <Button type="link" size="small" danger onClick={() => handlePurge(record)}>
            {t('adminRecycle.purge')}
          </Button>
        </span>
      ),
    },
  ]

  /** 表格自带分页（默认靠右） */
  const pagination = {
    current: query.pageNum,
    pageSize: query.pageSize,
    total,
    showSizeChanger: true,
    showTotal: (count) => t('common.total', { total: count }),
    position: ['bottomRight'],
  }

  return (
    <div className="admin-page">
      {/* 按类型分 tab：当前只有「用户」回收站；刷新按钮挂在 tab 栏右侧 */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabBarExtraContent={
          <Button icon={<ReloadOutlined />} loading={loading} onClick={handleRefresh} />
        }
        items={[
          {
            key: 'users',
            label: t('adminRecycle.tabUsers'),
            children: (
              <Table
                columns={columns}
                dataSource={records}
                loading={loading}
                pagination={pagination}
                rowKey="id"
                scroll={{ x: 'max-content' }}
                onChange={handleTableChange}
                locale={{ emptyText: <Empty description={t('adminRecycle.empty')} /> }}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
