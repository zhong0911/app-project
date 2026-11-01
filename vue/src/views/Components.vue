<script setup>
import { ref } from 'vue'
import { message } from '@/utils/app'

// 表单演示数据
const form = ref({
  username: '',
  selectValue: undefined,
  switchValue: true,
  radioValue: 'a',
  date: undefined,
  sliderValue: 30,
})

// 表格演示数据
const tableColumns = [
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '年龄', dataIndex: 'age', key: 'age' },
  { title: '地址', dataIndex: 'address', key: 'address' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '操作', key: 'action', width: 160 },
]
const tableData = [
  { key: 1, name: '张三', age: 28, address: '上海市浦东新区', status: 'active' },
  { key: 2, name: '李四', age: 32, address: '北京市朝阳区', status: 'normal' },
  { key: 3, name: '王五', age: 25, address: '广州市天河区', status: 'warning' },
]

// 抽屉演示
const drawerOpen = ref(false)
const drawerPlacement = ref('right')

// 结果页演示
const resultStatus = ref('success')

// 表单初始值（重置时复用）
const initialForm = () => ({
  username: '',
  selectValue: undefined,
  switchValue: true,
  radioValue: 'a',
  date: undefined,
  sliderValue: 30,
})

function handleSubmit() {
  message.success(`提交成功：${form.value.username || '匿名用户'}`)
}

function resetForm() {
  form.value = initialForm()
}

function openDrawer(placement) {
  drawerPlacement.value = placement
  drawerOpen.value = true
}
</script>

<template>
  <div class="component-preview">
    <a-typography>
      <a-typography-title :level="2">组件预览</a-typography-title>
      <a-typography-paragraph>
        常用 Antdv Next 组件一览，含暗色主题适配。可在顶栏切换亮/暗查看效果。
      </a-typography-paragraph>
    </a-typography>

    <!-- 按钮 -->
    <a-card title="Button 按钮" class="section-card">
      <a-space wrap>
        <a-button type="primary">主要按钮</a-button>
        <a-button>默认按钮</a-button>
        <a-button type="dashed">虚线按钮</a-button>
        <a-button type="text">文本按钮</a-button>
        <a-button type="link">链接按钮</a-button>
        <a-button type="primary" danger>危险按钮</a-button>
        <a-button type="primary" loading>加载中</a-button>
        <a-button type="primary" disabled>禁用</a-button>
      </a-space>
    </a-card>

    <!-- 表单输入：移动端标签在上（单列），桌面端标签在左 -->
    <a-card title="Form 表单" class="section-card">
      <a-form
        :label-col="{ xs: 24, sm: 4 }"
        :wrapper-col="{ xs: 24, sm: 16 }"
        style="max-width: 720px"
      >
        <a-form-item label="用户名">
          <a-input v-model:value="form.username" placeholder="请输入用户名" allow-clear />
        </a-form-item>
        <a-form-item label="下拉选择">
          <a-select
            v-model:value="form.selectValue"
            placeholder="请选择"
            :options="[
              { value: 'a', label: '选项 A' },
              { value: 'b', label: '选项 B' },
              { value: 'c', label: '选项 C' },
            ]"
          />
        </a-form-item>
        <a-form-item label="单选">
          <a-radio-group v-model:value="form.radioValue">
            <a-radio value="a">A</a-radio>
            <a-radio value="b">B</a-radio>
            <a-radio value="c">C</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="开关">
          <a-switch v-model:checked="form.switchValue" />
        </a-form-item>
        <a-form-item label="日期选择">
          <a-date-picker
            v-model:value="form.date"
            style="width: 100%; max-width: 200px"
            placeholder="选择日期"
          />
        </a-form-item>
        <a-form-item label="滑块">
          <a-slider v-model:value="form.sliderValue" style="width: 100%; max-width: 240px" />
        </a-form-item>
        <a-form-item :wrapper-col="{ xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 4 } }">
          <a-space>
            <a-button type="primary" @click="handleSubmit">提交</a-button>
            <a-button @click="resetForm">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 表格：移动端横向滚动 -->
    <a-card title="Table 表格" class="section-card">
      <a-table
        :columns="tableColumns"
        :data-source="tableData"
        :pagination="{ pageSize: 5 }"
        :scroll="{ x: 640 }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag v-if="record.status === 'warning'" color="warning">警告</a-tag>
            <a-tag v-else color="success">正常</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small">编辑</a-button>
              <a-button type="link" size="small" danger>删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 反馈与展示 -->
    <a-card title="反馈与展示" class="section-card">
      <a-space direction="vertical" size="large" style="width: 100%">
        <a-space wrap>
          <a-tag color="blue">标签 Tag</a-tag>
          <a-tag color="green">绿色</a-tag>
          <a-tag color="red">红色</a-tag>
          <a-badge :count="5">
            <a-avatar shape="square" style="background-color: #4c8bf5">A</a-avatar>
          </a-badge>
          <a-badge dot>
            <a-avatar shape="square" style="background-color: #52c41a">B</a-avatar>
          </a-badge>
        </a-space>

        <a-space direction="vertical" style="width: 100%">
          <a-alert message="成功提示 Alert" type="success" show-icon />
          <a-alert message="信息提示 Alert" type="info" show-icon />
          <a-alert message="警告提示 Alert" type="warning" show-icon />
        </a-space>

        <a-space wrap>
          <a-progress type="circle" :percent="75" />
          <a-progress type="dashboard" :percent="60" />
          <a-progress :percent="40" style="width: 100%; max-width: 240px" />
        </a-space>
      </a-space>
    </a-card>

    <!-- 其他常用 -->
    <a-card title="其他常用组件" class="section-card">
      <a-space direction="vertical" size="large" style="width: 100%">
        <a-tabs
          :items="[
            { key: '1', label: 'Tab 1', children: '这是第一个标签页的内容' },
            { key: '2', label: 'Tab 2', children: '这是第二个标签页的内容' },
            { key: '3', label: 'Tab 3', children: '这是第三个标签页的内容' },
          ]"
        />
        <a-space wrap>
          <a-tooltip title="提示文字">
            <a-button>Tooltip 提示</a-button>
          </a-tooltip>
          <a-popconfirm title="确定要删除吗？" ok-text="确定" cancel-text="取消">
            <a-button danger>Popconfirm 确认</a-button>
          </a-popconfirm>
          <a-dropdown
            :trigger="['click']"
            :menu="{
              items: [
                { key: '1', label: '菜单项 1' },
                { key: '2', label: '菜单项 2' },
                { key: '3', label: '菜单项 3' },
              ],
            }"
          >
            <a-button>Dropdown 下拉菜单</a-button>
          </a-dropdown>
        </a-space>
        <a-space>
          <a-pagination :total="100" show-size-changer show-quick-jumper />
        </a-space>
      </a-space>
    </a-card>

    <!-- 抽屉 -->
    <a-card title="Drawer 抽屉" class="section-card">
      <a-space wrap>
        <a-button type="primary" @click="openDrawer('right')">右侧抽屉</a-button>
        <a-button @click="openDrawer('left')">左侧抽屉</a-button>
        <a-button @click="openDrawer('top')">顶部抽屉</a-button>
        <a-button @click="openDrawer('bottom')">底部抽屉</a-button>
      </a-space>
      <a-drawer
        v-model:open="drawerOpen"
        :placement="drawerPlacement"
        title="抽屉标题"
        :size="drawerPlacement === 'left' || drawerPlacement === 'right' ? 378 : 256"
        :root-style="{ maxWidth: '100vw' }"
      >
        <p>这是 Drawer 抽屉内容，支持四个方向弹出。</p>
        <p style="margin-top: 12px">暗色主题下抽屉背景自动跟随全局配置。</p>
        <a-space style="margin-top: 16px">
          <a-button type="primary" @click="drawerOpen = false">确定</a-button>
          <a-button @click="drawerOpen = false">取消</a-button>
        </a-space>
      </a-drawer>
    </a-card>

    <!-- 结果页 -->
    <a-card title="Result 结果页" class="section-card">
      <a-radio-group v-model:value="resultStatus" class="result-radio-group">
        <a-radio-button value="success">成功</a-radio-button>
        <a-radio-button value="error">失败</a-radio-button>
        <a-radio-button value="warning">警告</a-radio-button>
        <a-radio-button value="info">信息</a-radio-button>
        <a-radio-button value="404">404</a-radio-button>
        <a-radio-button value="403">403</a-radio-button>
        <a-radio-button value="500">500</a-radio-button>
      </a-radio-group>
      <div style="margin-top: 16px">
        <a-result
          v-if="resultStatus === 'success'"
          status="success"
          title="操作成功"
          sub-title="这是一段成功结果的说明文字。"
        >
          <template #extra>
            <a-button type="primary" @click="message.success('重新执行成功')">再次执行</a-button>
          </template>
        </a-result>
        <a-result
          v-else-if="resultStatus === 'error'"
          status="error"
          title="操作失败"
          sub-title="这是一段失败结果的说明文字。"
        >
          <template #extra>
            <a-button type="primary" danger>返回修改</a-button>
          </template>
        </a-result>
        <a-result
          v-else-if="resultStatus === 'warning'"
          status="warning"
          title="存在警告"
          sub-title="这是一段警告结果的说明文字。"
        />
        <a-result
          v-else-if="resultStatus === 'info'"
          status="info"
          title="信息提示"
          sub-title="这是一段信息结果的说明文字。"
        />
        <a-result
          v-else-if="resultStatus === '404'"
          status="404"
          title="404"
          sub-title="抱歉，你访问的页面不存在。"
        >
          <template #extra>
            <a-button type="primary" @click="message.info('返回首页')">返回首页</a-button>
          </template>
        </a-result>
        <a-result v-else-if="resultStatus === '403'" status="403" title="403" sub-title="抱歉，你无权访问该页面。" />
        <a-result v-else status="500" title="500" sub-title="抱歉，服务器出错了。" />
      </div>
    </a-card>

    <!-- 空状态 -->
    <a-card title="Empty 空状态" class="section-card">
      <a-space size="large" align="start" wrap>
        <div style="width: 200px; max-width: 100%">
          <a-empty description="默认空状态" />
        </div>
        <div style="width: 200px; max-width: 100%">
          <a-empty image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg" description="自定义图片" />
        </div>
        <div style="width: 200px; max-width: 100%">
          <a-empty>
            <template #description>
              <span>自定义描述插槽</span>
            </template>
            <a-button type="primary" size="small">创建</a-button>
          </a-empty>
        </div>
      </a-space>
    </a-card>
  </div>
</template>

<style scoped>
.component-preview {
  padding: 8px;
}

.section-card {
  margin-bottom: 16px;
}

/* 移动端：结果页状态按钮组允许换行 */
.result-radio-group {
  display: flex;
  flex-wrap: wrap;
}
</style>
