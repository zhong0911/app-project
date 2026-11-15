import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Badge, Button, Card, Checkbox, Empty, Form, Input, Modal, Popover, Select, Space, Table, Tag, Tooltip } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons'

import {
  createAdminUserApi,
  deleteAdminUserApi,
  getAdminRolesApi,
  getAdminUsersApi,
  updateAdminUserApi,
  updateAdminUserStatusApi,
} from '@/api/admin'
import { useUserStore } from '@/stores/user'
import { message, modal } from '@/utils/app'
import { usePageTitle } from '@/utils/useTitle'

/**
 * 用户管理页
 *
 * 列：用户唯一标识 / 角色 / 状态 / 操作（编辑 · 停用启用 · 删除）
 * - 用户唯一标识取自 access_token 的 sub：SSO 应用可配置成 uid / username / email / phone，
 *   所以一律按字符串处理（SSO 的 uid 是整数，落库时也转成字符串），本地表不存昵称邮箱
 * - 角色来自后端「角色管理」，内置 ADMIN / USER；角色同时决定 JWT 里下发的权限
 * - 管理员不能停用/删除自己，避免把自己锁在后台外
 */
export default function AdminUsers() {
  const { t } = useTranslation()

  usePageTitle(t('nav.adminUsers'))

  const userInfo = useUserStore((s) => s.userInfo)

  // 列表查询条件（单一对象，变更即触发请求）
  const [query, setQuery] = useState({
    pageNum: 1,
    pageSize: 10,
    uid: '',
    role: undefined,
    status: undefined,
  })
  // 搜索框输入值（回车/点刷新才生效）
  const [uidInput, setUidInput] = useState('')

  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  /** 角色字典（内置 ADMIN / USER；接口失败时退回内置两项） */
  const [roles, setRoles] = useState([])

  const [submitting, setSubmitting] = useState(false)
  /** 正在提交「停用 / 启用」的行 id：按钮显示 loading，避免重复点击 */
  const [actingId, setActingId] = useState(null)
  /** 当前显示的列（「列设置」控制；操作列固定） */
  const [visibleKeys, setVisibleKeys] = useState(['uid', 'role', 'status', 'action'])

  // 新增弹窗
  const [addOpen, setAddOpen] = useState(false)
  const [addUid, setAddUid] = useState('')

  // 编辑弹窗（当前仅调整本地角色；uid 由 SSO 提供，不可修改）
  const [editing, setEditing] = useState(null)
  const [editRole, setEditRole] = useState('')

  const roleOptions = roles.length
    ? roles.map((role) => ({ value: role.code, label: `${role.name}（${role.code}）` }))
    : [
        { value: 'ADMIN', label: 'ADMIN' },
        { value: 'USER', label: 'USER' },
      ]

  const roleName = (code) => roles.find((role) => role.code === code)?.name || code

  /** 当前登录管理员自身：禁止禁用/删除自己（uid 一律按字符串比较，避免 int/string 误判） */
  const isSelf = (record) => String(record.uid ?? '') === String(userInfo?.uid ?? '')

  /* ---------------- 列表加载 ---------------- */
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const { data } = await getAdminUsersApi({
          pageNum: query.pageNum,
          pageSize: query.pageSize,
          uid: query.uid || undefined,
          role: query.role,
          status: query.status,
        })
        if (cancelled) return
        setRecords(data.records || [])
        setTotal(data.total || 0)
      } catch {
        // 错误提示由 axios 拦截器统一处理，这里只保证失败时不残留旧数据
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

  /** 拉取角色字典（失败时用内置 ADMIN / USER 兜底，不阻塞列表展示） */
  useEffect(() => {
    getAdminRolesApi({ includeDisabled: true })
      .then(({ data }) => setRoles(data || []))
      .catch(() => setRoles([]))
  }, [])

  const refresh = () => setQuery((q) => ({ ...q, _t: Date.now() }))

  const reloadAfterRemove = () =>
    setQuery((q) =>
      records.length === 1 && q.pageNum > 1 ? { ...q, pageNum: q.pageNum - 1 } : { ...q, _t: Date.now() },
    )

  const handleSearch = () => setQuery((q) => ({ ...q, pageNum: 1, uid: uidInput }))

  const handleTableChange = (pag) => {
    setQuery((q) => ({ ...q, pageNum: pag.current, pageSize: pag.pageSize }))
  }

  /* ---------------- 新增 / 编辑 / 状态 / 删除 ---------------- */
  const openAdd = () => {
    setAddUid('')
    setAddOpen(true)
  }

  const handleAdd = async () => {
    const uid = addUid.trim()
    if (!uid) {
      message.warning(t('adminUsers.uidRequired'))
      return
    }
    setSubmitting(true)
    try {
      await createAdminUserApi({ uid })
      message.success(t('adminUsers.addSuccess'))
      setAddOpen(false)
      setQuery((q) => ({ ...q, pageNum: 1 }))
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (record) => {
    setEditing(record)
    setEditRole(record.role)
  }

  const handleEdit = async () => {
    if (!editRole) {
      message.warning(t('adminUsers.roleRequired'))
      return
    }
    setSubmitting(true)
    try {
      await updateAdminUserApi(editing.id, { role: editRole })
      message.success(t('adminUsers.editSuccess'))
      setEditing(null)
      refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatus = async (record, enabled) => {
    // 同一时刻只允许一行在提交，按钮用 loading 反馈，避免重复点击
    if (actingId !== null) {
      return
    }
    setActingId(record.id)
    try {
      await updateAdminUserStatusApi(record.id, enabled ? 1 : 0)
      message.success(t(enabled ? 'adminUsers.enableSuccess' : 'adminUsers.disableSuccess'))
      refresh()
    } catch {
      // 失败时重新拉取，保证状态与后端一致
      refresh()
    } finally {
      setActingId(null)
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
        reloadAfterRemove()
      },
    })
  }

  /* ---------------- 表格列（可按「列设置」控制显隐） ---------------- */
  const columnDefs = [
    {
      title: t('adminUsers.columns.uid'),
      dataIndex: 'uid',
      key: 'uid',
      ellipsis: true,
      render: (value, record) => (
        <span className="cell-uid">
          <span className="mono uid-text" title={record.uid}>
            {record.uid}
          </span>
          {isSelf(record) && (
            <Tag color="blue" className="row-tag">
              {t('adminUsers.me')}
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: t('adminUsers.columns.role'),
      dataIndex: 'role',
      key: 'role',
      width: 140,
      render: (value) => (
        <Tag color={value === 'ADMIN' ? 'gold' : 'default'} className="row-tag">
          {roleName(value)}
        </Tag>
      ),
    },
    {
      title: t('adminUsers.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value) => (
        <Badge
          status={value === 1 ? 'success' : 'default'}
          text={value === 1 ? t('common.enabled') : t('common.disabled')}
        />
      ),
    },
    {
      title: t('adminUsers.columns.action'),
      key: 'action',
      width: 170,
      render: (_, record) => (
        <span className="cell-action">
          <Button type="link" size="small" disabled={isSelf(record)} onClick={() => openEdit(record)}>
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            size="small"
            loading={actingId === record.id}
            disabled={isSelf(record)}
            onClick={() => handleStatus(record, record.status !== 1)}
          >
            {record.status === 1 ? t('common.disable') : t('common.enable')}
          </Button>
          <Button type="link" size="small" danger disabled={isSelf(record)} onClick={() => handleDelete(record)}>
            {t('common.delete')}
          </Button>
        </span>
      ),
    },
  ]

  /** 当前显示的列（默认全显；操作列固定显示，避免隐藏后无从操作） */
  const visibleColumns = columnDefs.filter((col) => visibleKeys.includes(col.key))
  const columnOptions = columnDefs.map((col) => ({
    label: col.title,
    value: col.key,
    disabled: col.key === 'action',
  }))

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
    <>
      <Card variant="borderless" className="admin-card">
        {/* 工具栏：搜索框整行 → 状态 / 角色并排 → 添加按钮 + 刷新 / 列设置 */}
        <div className="user-toolbar">
          <div className="toolbar-row">
            <Input
              value={uidInput}
              onChange={(e) => setUidInput(e.target.value)}
              placeholder={t('adminUsers.searchUid')}
              allowClear
              prefix={<SearchOutlined />}
              className="search-input"
              onPressEnter={handleSearch}
            />
            <Button className="search-btn" icon={<SearchOutlined />} onClick={handleSearch} />
          </div>

          <Select
            value={query.status}
            placeholder={t('adminUsers.statusPlaceholder')}
            allowClear
            options={[
              { value: 1, label: t('common.enabled') },
              { value: 0, label: t('common.disabled') },
            ]}
            onChange={(value) => setQuery((q) => ({ ...q, pageNum: 1, status: value }))}
          />
          <Select
            value={query.role}
            placeholder={t('common.role')}
            allowClear
            options={roleOptions}
            onChange={(value) => setQuery((q) => ({ ...q, pageNum: 1, role: value }))}
          />

          <div className="toolbar-row action-row">
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              {t('adminUsers.addUser')}
            </Button>
            <Space size={8}>
              <Tooltip title={t('common.refresh')}>
                <Button shape="circle" icon={<ReloadOutlined />} loading={loading} onClick={handleSearch} />
              </Tooltip>
              <Popover
                trigger="click"
                placement="bottomRight"
                content={
                  <div className="column-setting">
                    <Checkbox.Group
                      value={visibleKeys}
                      options={columnOptions}
                      onChange={(keys) => {
                        // 操作列固定：取消勾选也自动补回
                        setVisibleKeys(keys.includes('action') ? keys : [...keys, 'action'])
                      }}
                    />
                  </div>
                }
              >
                <Button shape="circle" icon={<SettingOutlined />} />
              </Popover>
            </Space>
          </div>
        </div>

        <Table
          columns={visibleColumns}
          dataSource={records}
          loading={loading}
          pagination={pagination}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          onChange={handleTableChange}
          locale={{ emptyText: <Empty description={t('adminUsers.empty')} /> }}
        />
      </Card>

      {/* 新增用户：只填用户唯一标识 */}
      <Modal
        open={addOpen}
        title={t('adminUsers.addTitle')}
        okText={t('adminUsers.addOk')}
        confirmLoading={submitting}
        onOk={handleAdd}
        onCancel={() => setAddOpen(false)}
      >
        <Form layout="vertical">
          <Form.Item label={t('adminUsers.uidLabel')} required>
            <Input
              value={addUid}
              onChange={(e) => setAddUid(e.target.value)}
              placeholder={t('adminUsers.uidPlaceholder')}
              maxLength={64}
              allowClear
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑用户：uid 只读，仅调整本地角色 */}
      <Modal
        open={!!editing}
        title={t('adminUsers.editTitle')}
        okText={t('adminUsers.editOk')}
        confirmLoading={submitting}
        onOk={handleEdit}
        onCancel={() => setEditing(null)}
      >
        <Form layout="vertical">
          <Form.Item label={t('adminUsers.columns.uid')}>
            <Input value={editing?.uid} disabled />
          </Form.Item>
          <Form.Item label={t('adminUsers.roleLabel')} required>
            <Select value={editRole} options={roleOptions} onChange={setEditRole} />
          </Form.Item>
          <Alert type="info" showIcon message={t('adminUsers.roleHint')} />
        </Form>
      </Modal>
    </>
  )
}
