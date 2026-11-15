import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Image,
  Input,
  Radio,
  Space,
  Table,
  Upload,
} from 'antd'
import {
  CopyOutlined,
  DeleteOutlined,
  InboxOutlined,
  ReloadOutlined,
  UndoOutlined,
  UploadOutlined,
} from '@ant-design/icons'

import {
  deleteImageApi,
  getImageRecycleApi,
  getImagesApi,
  purgeImageApi,
  restoreImageApi,
  uploadImageApi,
} from '@/api/image'
import { message, modal } from '@/utils/app'
import { usePageTitle } from '@/utils/useTitle'

/**
 * 图床页
 *
 * - 拖拽 / 批量上传、Ctrl+V 粘贴上传
 * - 缩略图列表、复制直链 / Markdown / HTML
 * - 回收站恢复与彻底删除
 *
 * 图片直链由后端按 uuid 生成（同内容 sha256 命中时自动复用已有链接）。
 */

/** 单图上限（与后端 IMAGE_MAX_SIZE 保持一致，后端仍会二次校验） */
const MAX_SIZE = 10 * 1024 * 1024
const ALLOW_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/avif']
const ACCEPT = ALLOW_MIME.join(',')

/** 复制文本：优先 Clipboard API，失败回退到临时 textarea（兼容非 https 内网环境），返回是否成功 */
async function copyText(text) {
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
    return true
  } catch {
    return false
  }
}

export default function ImageBed() {
  const { t } = useTranslation()

  usePageTitle(t('nav.imageBed'))

  // 列表查询条件（单一对象，变更即触发重新请求）
  const [query, setQuery] = useState({ pageNum: 1, pageSize: 10, keyword: '', tab: 'mine' })
  // 搜索框输入值（点刷新/回车才写入 query，避免每敲一个字都请求）
  const [keywordInput, setKeywordInput] = useState('')

  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // 正在上传的任务数（>0 时上传入口显示 loading）
  const [uploadingCount, setUploadingCount] = useState(0)
  const uploading = uploadingCount > 0

  const isRecycle = query.tab === 'recycle'

  const fileInputRef = useRef(null)

  // 上传成功的链接延迟合并复制：批量上传时只复制最后一次成功的链接
  const copyTimerRef = useRef(null)
  const lastUrlRef = useRef('')

  // 复制提示文案：copyText 在模块级，成功/失败提示在这里统一处理
  const doCopy = async (text, successText) => {
    const ok = await copyText(text)
    if (ok) {
      message.success(successText || t('imageBed.copied'))
    } else {
      message.error(t('imageBed.copyFailed'))
    }
  }

  const formatSize = (bytes) => {
    const size = Number(bytes) || 0
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1048576).toFixed(2)} MB`
  }

  const dimension = (record) =>
    record.width && record.height ? `${record.width} × ${record.height}` : t('imageBed.unknownSize')

  /* ---------------- 列表加载 ---------------- */
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const api = query.tab === 'recycle' ? getImageRecycleApi : getImagesApi
        const { data } = await api({
          pageNum: query.pageNum,
          pageSize: query.pageSize,
          keyword: query.keyword || undefined,
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

  /** 仅刷新（条件不变，用新对象引用触发effect） */
  const refresh = () => setQuery((q) => ({ ...q, _t: Date.now() }))

  /** 删除/恢复后：当前页只剩一条时回退一页，否则原地刷新 */
  const reloadAfterRemove = () =>
    setQuery((q) =>
      records.length === 1 && q.pageNum > 1 ? { ...q, pageNum: q.pageNum - 1 } : { ...q, _t: Date.now() },
    )

  const handleSearch = () => setQuery((q) => ({ ...q, pageNum: 1, keyword: keywordInput }))

  const handleTabChange = (e) => {
    setRecords([])
    setTotal(0)
    setQuery((q) => ({ ...q, tab: e.target.value, pageNum: 1 }))
  }

  const handleTableChange = (pag) => {
    setQuery((q) => ({ ...q, pageNum: pag.current, pageSize: pag.pageSize }))
  }

  /* ---------------- 复制 ---------------- */
  const queueCopy = (url) => {
    lastUrlRef.current = url
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => {
      if (lastUrlRef.current) {
        doCopy(lastUrlRef.current, t('imageBed.copySuccess'))
      }
    }, 300)
  }

  const copyMarkdown = (record) => doCopy(`![${record.originName || record.uuid}](${record.url})`)
  const copyHtml = (record) => doCopy(`<img src="${record.url}" alt="${record.originName || record.uuid}" />`)

  /** 行内「更多」菜单：复制 HTML / 新窗口打开原图 */
  const handleMore = (key, record) => {
    if (key === 'html') {
      copyHtml(record)
      return
    }
    window.open(record.url, '_blank', 'noopener')
  }

  /* ---------------- 上传 ---------------- */
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

  /** 上传成功后的收尾：提示、复制直链、切回「我的图片」并重载 */
  const handleResult = (res) => {
    const image = res?.data?.image
    if (!image) return
    message.success(res.data.dedup ? t('imageBed.uploadDedup') : t('imageBed.uploadSuccess'))
    // 上传即复制直链，省掉一次手动操作
    queueCopy(image.url)
    setQuery((q) => (q.tab === 'recycle' ? { ...q, tab: 'mine', pageNum: 1 } : { ...q, pageNum: 1 }))
  }

  /** 统一上传入口：拖拽 / 选择 / 粘贴共用；onFinish 用于回传 Upload 的完成回调 */
  const uploadOne = async (file, onFinish) => {
    if (!validateFile(file)) {
      onFinish?.()
      return
    }
    setUploadingCount((n) => n + 1)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadImageApi(formData)
      handleResult(res)
    } catch {
      // 失败提示由 axios 拦截器统一处理
    } finally {
      setUploadingCount((n) => n - 1)
      onFinish?.()
    }
  }

  // 粘贴监听在 effect 里注册一次，用 ref 拿到最新的 uploadOne（避免捕获旧闭包）
  const uploadOneRef = useRef(uploadOne)
  uploadOneRef.current = uploadOne

  useEffect(() => {
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
      files.forEach((file) => uploadOneRef.current(file))
    }
    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  /** Upload 自定义上传（走统一 axios 实例，带登录态与错误提示） */
  const handleUpload = ({ file, onSuccess }) => {
    uploadOne(file, () => onSuccess?.({}, file))
  }

  const beforeUpload = (file) => validateFile(file)

  /** 隐藏的原生 file 选择框：供顶部「上传图片」按钮触发（支持多选） */
  const openPicker = () => {
    if (!uploading) fileInputRef.current?.click()
  }

  const handleFilePick = (event) => {
    const files = Array.from(event.target.files || [])
    files.forEach((file) => uploadOne(file))
    // 清空 value，保证连续选择同一张图片也能触发 change
    event.target.value = ''
  }

  /* ---------------- 删除 / 恢复 / 彻底删除 ---------------- */
  const handleDelete = (record) => {
    modal.confirm({
      title: t('imageBed.deleteTitle'),
      content: t('imageBed.deleteConfirm', { name: record.originName || record.uuid }),
      okText: t('imageBed.deleteOk'),
      okButtonProps: { danger: true },
      onOk: async () => {
        await deleteImageApi(record.uuid)
        message.success(t('imageBed.deleteSuccess'))
        reloadAfterRemove()
      },
    })
  }

  const handleRestore = async (record) => {
    await restoreImageApi(record.uuid)
    message.success(t('imageBed.restoreSuccess'))
    reloadAfterRemove()
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
        reloadAfterRemove()
      },
    })
  }

  /* ---------------- 表格列 ---------------- */
  const columns = useMemo(() => {
    const base = [
      {
        title: t('imageBed.columns.preview'),
        key: 'preview',
        width: 96,
        render: (_, record) => <Image src={record.url} width={64} height={48} className="thumb" />,
      },
      {
        title: t('imageBed.columns.name'),
        dataIndex: 'originName',
        key: 'originName',
        ellipsis: true,
        render: (_, record) => (
          <span className="name-text" title={record.originName}>
            {record.originName || record.uuid}
          </span>
        ),
      },
      {
        title: t('imageBed.columns.size'),
        key: 'size',
        width: 100,
        render: (_, record) => <span className="meta-text mono">{formatSize(record.size)}</span>,
      },
      {
        title: t('imageBed.columns.dimension'),
        key: 'dimension',
        width: 120,
        render: (_, record) => <span className="meta-text mono">{dimension(record)}</span>,
      },
    ]

    if (!isRecycle) {
      base.push({
        title: t('imageBed.columns.visits'),
        dataIndex: 'visitCount',
        key: 'visitCount',
        width: 90,
        render: (value) => <span className="meta-text mono">{value}</span>,
      })
    }

    base.push({
      title: t('imageBed.columns.createTime'),
      dataIndex: 'createTime',
      key: 'createTime',
      width: 170,
      render: (value) => <span className="meta-text mono">{value || '—'}</span>,
    })

    base.push({
      title: t('imageBed.columns.action'),
      key: 'action',
      width: isRecycle ? 150 : 210,
      render: (_, record) =>
        isRecycle ? (
          <span className="cell-action">
            <Button type="link" size="small" icon={<UndoOutlined />} onClick={() => handleRestore(record)}>
              {t('common.restore')}
            </Button>
            <Button type="link" size="small" danger onClick={() => handlePurge(record)}>
              {t('common.purge')}
            </Button>
          </span>
        ) : (
          <span className="cell-action">
            <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => doCopy(record.url, t('imageBed.copied'))}>
              {t('imageBed.copyLink')}
            </Button>
            <Button type="link" size="small" onClick={() => copyMarkdown(record)}>
              {t('imageBed.copyMarkdown')}
            </Button>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'html', label: t('imageBed.copyHtml') },
                  { key: 'open', label: t('imageBed.openImage') },
                ],
                onClick: ({ key }) => handleMore(key, record),
              }}
            >
              <Button type="link" size="small">{t('imageBed.more')}</Button>
            </Dropdown>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
              {t('common.delete')}
            </Button>
          </span>
        ),
    })

    return base
    // 依赖：语言、回收站态（列定义随之变化）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, isRecycle, records])

  /** 表格自带分页，靠右对齐 */
  const pagination = {
    current: query.pageNum,
    pageSize: query.pageSize,
    total,
    showSizeChanger: true,
    showTotal: (count) => t('common.total', { total: count }),
    position: ['bottomRight'],
  }

  return (
    <div className="tool-page-card">
      <Card
        variant="borderless"
        className="image-card"
        title={t('imageBed.title')}
        extra={
          <Space wrap>
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder={t('imageBed.searchPlaceholder')}
              allowClear
              style={{ width: 200 }}
              onPressEnter={handleSearch}
            />
            <Button type="primary" icon={<ReloadOutlined />} onClick={handleSearch}>
              {t('common.refresh')}
            </Button>
            <Button type="primary" icon={<UploadOutlined />} loading={uploading} onClick={openPicker}>
              {t('imageBed.upload')}
            </Button>
          </Space>
        }
      >
        {/* 隐藏的原生文件选择框（支持多选） */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden-input"
          onChange={handleFilePick}
        />

        {/* 上传落区：拖拽 / 点击 / 粘贴 三种入口都落在这里 */}
        <Upload.Dragger
          multiple
          showUploadList={false}
          beforeUpload={beforeUpload}
          customRequest={handleUpload}
          disabled={uploading}
          className="drop-zone"
          accept={ACCEPT}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">{t('imageBed.dropTitle')}</p>
          <p className="ant-upload-hint">{t('imageBed.dropHint')}</p>
        </Upload.Dragger>

        <div className="tabs-row">
          <Radio.Group value={query.tab} buttonStyle="solid" onChange={handleTabChange}>
            <Radio.Button value="mine">{t('imageBed.tabMine')}</Radio.Button>
            <Radio.Button value="recycle">{t('imageBed.tabRecycle')}</Radio.Button>
          </Radio.Group>
          {isRecycle && <span className="recycle-hint">{t('imageBed.recycleHint')}</span>}
        </div>

        <Table
          columns={columns}
          dataSource={records}
          loading={loading}
          pagination={pagination}
          rowKey="uuid"
          scroll={{ x: 900 }}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <Empty description={isRecycle ? t('imageBed.recycleEmpty') : t('imageBed.empty')} />
            ),
          }}
        />
      </Card>
    </div>
  )
}
