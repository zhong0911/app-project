import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  DatePicker,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  Pagination,
  Popconfirm,
  Progress,
  Radio,
  Result,
  Select,
  Slider,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'

import { message } from '@/utils/app'

/**
 * 组件预览页：把模板常用的 Ant Design 组件摆在一起
 * 暗色主题、多语言随全局 ConfigProvider 自动切换，改动配置即可对照查看效果。
 */
export default function Components() {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  const [formState, setFormState] = useState({
    switchValue: true,
    radioValue: 'a',
    sliderValue: 30,
  })
  const [dateValue, setDateValue] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerPlacement, setDrawerPlacement] = useState('right')
  const [resultStatus, setResultStatus] = useState('success')

  const openDrawer = (placement) => {
    setDrawerPlacement(placement)
    setDrawerOpen(true)
  }

  const handleSubmit = () => {
    const name = form.getFieldValue('username') || t('components.anonymous')
    message.success(t('components.submitSuccess', { name }))
  }

  const resetForm = () => {
    form.resetFields()
    setFormState({ switchValue: true, radioValue: 'a', sliderValue: 30 })
    setDateValue(null)
  }

  // 表格演示数据（固定示例，不接后端）
  const tableData = [
    { key: 1, name: '张三', age: 28, address: '上海市浦东新区', status: 'active' },
    { key: 2, name: '李四', age: 32, address: '北京市朝阳区', status: 'normal' },
    { key: 3, name: '王五', age: 25, address: '广州市天河区', status: 'warning' },
  ]

  const tableColumns = [
    { title: t('components.name'), dataIndex: 'name', key: 'name' },
    { title: t('components.age'), dataIndex: 'age', key: 'age' },
    { title: t('components.address'), dataIndex: 'address', key: 'address' },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (value) =>
        value === 'warning' ? (
          <Tag color="warning">{t('components.warning')}</Tag>
        ) : (
          <Tag color="success">{t('components.normal')}</Tag>
        ),
    },
    {
      title: t('common.actions'),
      key: 'action',
      width: 160,
      render: () => (
        <Space>
          <Button type="link" size="small" onClick={() => message.info(t('common.edit'))}>
            {t('common.edit')}
          </Button>
          <Button type="link" size="small" danger onClick={() => message.warning(t('components.popconfirm'))}>
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ]

  const tabItems = [
    { key: '1', label: 'Tab 1', children: t('components.tab1Content') },
    { key: '2', label: 'Tab 2', children: t('components.tab2Content') },
    { key: '3', label: 'Tab 3', children: t('components.tab3Content') },
  ]

  const renderResult = () => {
    switch (resultStatus) {
      case 'success':
        return (
          <Result
            status="success"
            title={t('components.opSuccess')}
            subTitle={t('components.opSuccessDesc')}
            extra={
              <Button type="primary" onClick={() => message.success(t('components.opSuccess'))}>
                {t('components.repeat')}
              </Button>
            }
          />
        )
      case 'error':
        return (
          <Result
            status="error"
            title={t('components.opError')}
            subTitle={t('components.opErrorDesc')}
            extra={
              <Button type="primary" danger>
                {t('components.backEdit')}
              </Button>
            }
          />
        )
      case 'warning':
        return <Result status="warning" title={t('components.opWarning')} subTitle={t('components.opWarningDesc')} />
      case 'info':
        return <Result status="info" title={t('components.opInfo')} subTitle={t('components.opInfoDesc')} />
      case '404':
        return (
          <Result
            status="404"
            title="404"
            subTitle={t('notFound.subtitle')}
            extra={
              <Button type="primary" onClick={() => message.info(t('notFound.back'))}>
                {t('notFound.back')}
              </Button>
            }
          />
        )
      case '403':
        return <Result status="403" title="403" subTitle={t('components.noPermission')} />
      default:
        return <Result status="500" title="500" subTitle={t('components.serverError')} />
    }
  }

  return (
    <div className="component-preview">
      <Typography.Title level={2}>{t('components.title')}</Typography.Title>
      <Typography.Paragraph>{t('components.desc')}</Typography.Paragraph>

      {/* 按钮 */}
      <Card title={t('components.button')} className="section-card">
        <Space wrap>
          <Button type="primary">{t('components.primary')}</Button>
          <Button>{t('components.default')}</Button>
          <Button type="dashed">{t('components.dashed')}</Button>
          <Button type="text">{t('components.text')}</Button>
          <Button type="link">{t('components.link')}</Button>
          <Button type="primary" danger>
            {t('components.danger')}
          </Button>
          <Button type="primary" loading>
            {t('components.loading')}
          </Button>
          <Button type="primary" disabled>
            {t('common.disabled')}
          </Button>
        </Space>
      </Card>

      {/* 表单：移动端标签在上（单列），桌面端标签在左 */}
      <Card title={t('components.form')} className="section-card">
        <Form
          form={form}
          labelCol={{ xs: 24, sm: 4 }}
          wrapperCol={{ xs: 24, sm: 16 }}
          style={{ maxWidth: 720 }}
          initialValues={{ radioValue: 'a', switchValue: true, sliderValue: 30 }}
        >
          <Form.Item label={t('components.username')} name="username">
            <Input placeholder={t('components.usernamePlaceholder')} allowClear />
          </Form.Item>
          <Form.Item label={t('components.select')} name="selectValue">
            <Select
              placeholder={t('components.selectPlaceholder')}
              options={[
                { value: 'a', label: t('components.optionA') },
                { value: 'b', label: t('components.optionB') },
                { value: 'c', label: t('components.optionC') },
              ]}
            />
          </Form.Item>
          <Form.Item label={t('components.radio')}>
            <Radio.Group
              value={formState.radioValue}
              onChange={(event) => setFormState((prev) => ({ ...prev, radioValue: event.target.value }))}
            >
              <Radio value="a">A</Radio>
              <Radio value="b">B</Radio>
              <Radio value="c">C</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label={t('components.switch')}>
            <Switch
              checked={formState.switchValue}
              onChange={(checked) => setFormState((prev) => ({ ...prev, switchValue: checked }))}
            />
          </Form.Item>
          <Form.Item label={t('components.date')}>
            <DatePicker
              value={dateValue}
              onChange={setDateValue}
              style={{ width: '100%', maxWidth: 200 }}
              placeholder={t('components.datePlaceholder')}
            />
          </Form.Item>
          <Form.Item label={t('components.slider')}>
            <Slider
              value={formState.sliderValue}
              onChange={(value) => setFormState((prev) => ({ ...prev, sliderValue: value }))}
              style={{ width: '100%', maxWidth: 240 }}
            />
          </Form.Item>
          <Form.Item wrapperCol={{ xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 4 } }}>
            <Space>
              <Button type="primary" onClick={handleSubmit}>
                {t('components.submit')}
              </Button>
              <Button onClick={resetForm}>{t('common.reset')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 表格：移动端横向滚动 */}
      <Card title={t('components.table')} className="section-card">
        <Table
          columns={tableColumns}
          dataSource={tableData}
          pagination={{ pageSize: 5 }}
          scroll={{ x: 640 }}
          size="middle"
        />
      </Card>

      {/* 反馈与展示 */}
      <Card title={t('components.feedback')} className="section-card">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap>
            <Tag color="blue">{t('components.tagLabel')}</Tag>
            <Tag color="green">{t('components.green')}</Tag>
            <Tag color="red">{t('components.red')}</Tag>
            <Badge count={5}>
              <Avatar shape="square" style={{ backgroundColor: '#4c8bf5' }}>
                A
              </Avatar>
            </Badge>
            <Badge dot>
              <Avatar shape="square" style={{ backgroundColor: '#52c41a' }}>
                B
              </Avatar>
            </Badge>
          </Space>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert message={t('components.alertSuccess')} type="success" showIcon />
            <Alert message={t('components.alertInfo')} type="info" showIcon />
            <Alert message={t('components.alertWarning')} type="warning" showIcon />
          </Space>

          <Space wrap>
            <Progress type="circle" percent={75} />
            <Progress type="dashboard" percent={60} />
            <Progress percent={40} style={{ width: '100%', maxWidth: 240 }} />
          </Space>
        </Space>
      </Card>

      {/* 其他常用 */}
      <Card title={t('components.other')} className="section-card">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Tabs items={tabItems} />
          <Space wrap>
            <Tooltip title={t('components.tooltip')}>
              <Button>{t('components.tooltipBtn')}</Button>
            </Tooltip>
            <Popconfirm
              title={t('components.popconfirm')}
              okText={t('components.ok')}
              cancelText={t('components.cancel')}
            >
              <Button danger>{t('components.popconfirmBtn')}</Button>
            </Popconfirm>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: '1', label: t('components.menuItem1') },
                  { key: '2', label: t('components.menuItem2') },
                  { key: '3', label: t('components.menuItem3') },
                ],
              }}
            >
              <Button>{t('components.dropdownBtn')}</Button>
            </Dropdown>
          </Space>
          <Space>
            <Pagination total={100} showSizeChanger showQuickJumper />
          </Space>
        </Space>
      </Card>

      {/* 抽屉 */}
      <Card title={t('components.drawer')} className="section-card">
        <Space wrap>
          <Button type="primary" onClick={() => openDrawer('right')}>
            {t('components.drawerRight')}
          </Button>
          <Button onClick={() => openDrawer('left')}>{t('components.drawerLeft')}</Button>
          <Button onClick={() => openDrawer('top')}>{t('components.drawerTop')}</Button>
          <Button onClick={() => openDrawer('bottom')}>{t('components.drawerBottom')}</Button>
        </Space>
        <Drawer
          open={drawerOpen}
          placement={drawerPlacement}
          title={t('components.drawerTitle')}
          width={drawerPlacement === 'left' || drawerPlacement === 'right' ? 378 : undefined}
          height={drawerPlacement === 'top' || drawerPlacement === 'bottom' ? 256 : undefined}
          rootStyle={{ maxWidth: '100vw' }}
          onClose={() => setDrawerOpen(false)}
        >
          <p>{t('components.drawerP1')}</p>
          <p style={{ marginTop: 12 }}>{t('components.drawerP2')}</p>
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => setDrawerOpen(false)}>
              {t('components.ok')}
            </Button>
            <Button onClick={() => setDrawerOpen(false)}>{t('components.cancel')}</Button>
          </Space>
        </Drawer>
      </Card>

      {/* 结果页 */}
      <Card title={t('components.result')} className="section-card">
        <Radio.Group
          value={resultStatus}
          onChange={(event) => setResultStatus(event.target.value)}
          className="result-radio-group"
        >
          <Radio.Button value="success">{t('components.resSuccess')}</Radio.Button>
          <Radio.Button value="error">{t('components.resError')}</Radio.Button>
          <Radio.Button value="warning">{t('components.resWarning')}</Radio.Button>
          <Radio.Button value="info">{t('components.resInfo')}</Radio.Button>
          <Radio.Button value="404">404</Radio.Button>
          <Radio.Button value="403">403</Radio.Button>
          <Radio.Button value="500">500</Radio.Button>
        </Radio.Group>
        <div style={{ marginTop: 16 }}>{renderResult()}</div>
      </Card>

      {/* 空状态 */}
      <Card title={t('components.empty')} className="section-card">
        <Space size="large" align="start" wrap>
          <div style={{ width: 200, maxWidth: '100%' }}>
            <Empty description={t('components.emptyDefault')} />
          </div>
          <div style={{ width: 200, maxWidth: '100%' }}>
            <Empty
              image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
              description={t('components.emptyCustom')}
            />
          </div>
          <div style={{ width: 200, maxWidth: '100%' }}>
            <Empty description={<span>{t('components.emptySlot')}</span>}>
              <Button type="primary" size="small">
                {t('components.create')}
              </Button>
            </Empty>
          </div>
        </Space>
      </Card>
    </div>
  )
}
