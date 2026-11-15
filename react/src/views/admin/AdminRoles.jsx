import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Badge, Button, Empty, Form, Input, Modal, Select, Space, Table, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'

import { createAdminRoleApi, deleteAdminRoleApi, getAdminRolesApi, updateAdminRoleApi } from '@/api/admin'
import ColumnPicker from '@/components/ColumnPicker'
import { message, modal } from '@/utils/app'

/**
 * 角色管理页：本地角色字典（编码 / 名称 / 描述 / 状态）。
 *
 * 内置 ADMIN / USER 由后端标记 builtIn=1：编码不可改、不可删除；
 * 仍被用户引用的角色也不可删（后端校验，前端只做按钮禁用提示）。
 */
// 编码规则与后端 RoleDTO 一致：字母开头，字母 / 数字 / 下划线，长度 2-32
const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_]{1,31}$/

export default function AdminRoles() {
  const { t } = useTranslation()

  const [loading, setLoading] = useState(false)
  const [allRecords, setAllRecords] = useState([])
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState(undefined)

  /** 正在提交「停用 / 启用」的行 id：按钮显示 loading，避免重复点击 */
  const [actingId, setActingId] = useState(null)

  const [visibleKeys, setVisibleKeys] = useState(['code', 'name', 'description', 'status', 'action'])

  const [addOpen, setAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [addForm, setAddForm] = useState({ code: '', name: '', description: '' })

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ code: '', name: '', description: '' })

  /** 接口只按启用状态维度返回数据，关键字与状态在页面内过滤（角色总量很小，不分页） */
  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getAdminRolesApi({ includeDisabled: true })
      setAllRecords(data || [])
    } catch {
      // 错误提示由 axios 拦截器统一处理，这里只保证失败时不残留旧数据
      setAllRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const records = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return allRecords.filter((role) => {
      if (status !== undefined && Number(role.status) !== Number(status)) {
        return false
      }
      if (!kw) {
        return true
      }
      return (
        String(role.code || '').toLowerCase().includes(kw) ||
        String(role.name || '').toLowerCase().includes(kw)
      )
    })
  }, [allRecords, keyword, status])

  const openAdd = () => {
    setAddForm({ code: '', name: '', description: '' })
    setAddOpen(true)
  }

  const handleAdd = async () => {
    const code = addForm.code.trim().toUpperCase()
    const name = addForm.name.trim()
    if (!code) {
      message.warning(t('adminRoles.codeRequired'))
      return
    }
    if (!CODE_PATTERN.test(code)) {
      message.warning(t('adminRoles.codeInvalid'))
      return
    }
    if (!name) {
      message.warning(t('adminRoles.nameRequired'))
      return
    }
    setSubmitting(true)
    try {
      await createAdminRoleApi({ code, name, description: addForm.description.trim() || undefined })
      message.success(t('adminRoles.addSuccess'))
      setAddOpen(false)
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (record) => {
    setEditing(record)
    setEditForm({ code: record.code, name: record.name, description: record.description || '' })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    const code = editForm.code.trim()
    const name = editForm.name.trim()
    if (!code) {
      message.warning(t('adminRoles.codeRequired'))
      return
    }
    if (!CODE_PATTERN.test(code)) {
      message.warning(t('adminRoles.codeInvalid'))
      return
    }
    if (!name) {
      message.warning(t('adminRoles.nameRequired'))
      return
    }
    setSubmitting(true)
    try {
      await updateAdminRoleApi(editing.id, {
        code,
        name,
        description: editForm.description.trim() || undefined,
        status: editing.status,
        sort: editing.sort,
      })
      message.success(t('adminRoles.editSuccess'))
      setEditOpen(false)
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  /** 停用 / 启用：后端没有独立状态端点，用整体更新（DTO 里的 code、name 必填，原值回传） */
  const handleStatus = async (record, checked) => {
    if (actingId !== null) {
      return
    }
    setActingId(record.id)
    try {
      await updateAdminRoleApi(record.id, {
        code: record.code,
        name: record.name,
        description: record.description || undefined,
        status: checked ? 1 : 0,
        sort: record.sort,
      })
      message.success(t(checked ? 'adminRoles.enableSuccess' : 'adminRoles.disableSuccess'))
      await load()
    } catch {
      await load()
    } finally {
      setActingId(null)
    }
  }

  const handleDelete = (record) => {
    modal.confirm({
      title: t('adminRoles.deleteTitle'),
      content: t('adminRoles.deleteConfirm', { name: record.name }),
      okText: t('adminRoles.deleteOk'),
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteAdminRoleApi(record.id)
        message.success(t('adminRoles.deleteSuccess'))
        await load()
      },
    })
  }

  /** 列定义（放在操作函数之后：操作列直接引用 openEdit / handleStatus / handleDelete） */
  const columnDefs = [
    {
      title: t('adminRoles.columns.code'),
      dataIndex: 'code',
      key: 'code',
      width: 160,
      render: (_, record) => (
        <span className="cell-action">
          <span className="mono">{record.code}</span>
          {record.builtIn === 1 && (
            <Tag color="blue" className="row-tag">
              {t('adminRoles.builtIn')}
            </Tag>
          )}
        </span>
      ),
    },
    { title: t('adminRoles.columns.name'), dataIndex: 'name', key: 'name', width: 160 },
    {
      title: t('adminRoles.columns.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value) => <span className="meta-text">{value || '-'}</span>,
    },
    {
      title: t('adminRoles.columns.status'),
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
      title: t('adminRoles.columns.action'),
      key: 'action',
      width: 190,
      render: (_, record) => (
        <span className="cell-action">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            size="small"
            loading={actingId === record.id}
            onClick={() => handleStatus(record, record.status !== 1)}
          >
            {record.status === 1 ? t('common.disable') : t('common.enable')}
          </Button>
          <Button type="link" size="small" danger disabled={record.builtIn === 1} onClick={() => handleDelete(record)}>
            {t('common.delete')}
          </Button>
        </span>
      ),
    },
  ]

  const columns = columnDefs.filter((col) => visibleKeys.includes(col.key))

  return (
    <>
      <div className="admin-page">
        {/* 工具栏：搜索框整行 → 状态筛选 → 新增按钮 + 刷新 / 列设置 */}
        <div className="user-toolbar">
          <Input.Search
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('adminRoles.searchPlaceholder')}
            allowClear
            enterButton={<SearchOutlined />}
            className="search-input"
          />

          <Select
            value={status}
            placeholder={t('adminRoles.statusPlaceholder')}
            allowClear
            options={[
              { value: 1, label: t('common.enabled') },
              { value: 0, label: t('common.disabled') },
            ]}
            onChange={(value) => setStatus(value)}
            className="status-select"
          />

          <div className="toolbar-row action-row">
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              {t('adminRoles.addRole')}
            </Button>
            <Space size={8}>
              <Button icon={<ReloadOutlined />} loading={loading} onClick={load} />
              <ColumnPicker
                columns={columnDefs}
                value={visibleKeys}
                onChange={setVisibleKeys}
                storageKey="admin-roles"
                lockedKeys={['action']}
              />
            </Space>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={records}
          loading={loading}
          pagination={false}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description={t('adminRoles.empty')} /> }}
        />
      </div>

      {/* 新增角色 */}
      <Modal
        open={addOpen}
        title={t('adminRoles.addTitle')}
        okText={t('adminRoles.addOk')}
        confirmLoading={submitting}
        onCancel={() => setAddOpen(false)}
        onOk={handleAdd}
      >
        <Form layout="vertical">
          <Form.Item label={t('adminRoles.codeLabel')} required>
            <Input
              value={addForm.code}
              onChange={(e) => setAddForm({ ...addForm, code: e.target.value })}
              placeholder={t('adminRoles.codePlaceholder')}
              maxLength={32}
              allowClear
            />
          </Form.Item>
          <Form.Item label={t('adminRoles.nameLabel')} required>
            <Input
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              maxLength={64}
              allowClear
            />
          </Form.Item>
          <Form.Item label={t('adminRoles.descriptionLabel')}>
            <Input.TextArea
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              maxLength={255}
              rows={2}
              showCount
            />
          </Form.Item>
          <Alert type="info" showIcon message={t('adminRoles.codeHint')} />
        </Form>
      </Modal>

      {/* 编辑角色：内置角色编码不可改 */}
      <Modal
        open={editOpen}
        title={t('adminRoles.editTitle')}
        okText={t('adminRoles.editOk')}
        confirmLoading={submitting}
        onCancel={() => setEditOpen(false)}
        onOk={handleEdit}
      >
        <Form layout="vertical">
          <Form.Item label={t('adminRoles.codeLabel')} required>
            <Input
              value={editForm.code}
              onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
              maxLength={32}
              disabled={editing?.builtIn === 1}
            />
          </Form.Item>
          <Form.Item label={t('adminRoles.nameLabel')} required>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              maxLength={64}
              allowClear
            />
          </Form.Item>
          <Form.Item label={t('adminRoles.descriptionLabel')}>
            <Input.TextArea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              maxLength={255}
              rows={2}
              showCount
            />
          </Form.Item>
          {editing?.builtIn === 1 && <Alert type="info" showIcon message={t('adminRoles.builtInHint')} />}
        </Form>
      </Modal>
    </>
  )
}
