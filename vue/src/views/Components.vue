<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from '@/utils/app'

const { t } = useI18n()

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
const tableColumns = computed(() => [
  { title: t('components.name'), dataIndex: 'name', key: 'name' },
  { title: t('components.age'), dataIndex: 'age', key: 'age' },
  { title: t('components.address'), dataIndex: 'address', key: 'address' },
  { title: t('common.status'), dataIndex: 'status', key: 'status' },
  { title: t('common.actions'), key: 'action', width: 160 },
])
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
  const name = form.value.username || t('components.anonymous')
  message.success(t('components.submitSuccess', { name }))
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
      <a-typography-title :level="2">{{ t('components.title') }}</a-typography-title>
      <a-typography-paragraph>{{ t('components.desc') }}</a-typography-paragraph>
    </a-typography>

    <!-- 按钮 -->
    <a-card :title="t('components.button')" class="section-card">
      <a-space wrap>
        <a-button type="primary">{{ t('components.primary') }}</a-button>
        <a-button>{{ t('components.default') }}</a-button>
        <a-button type="dashed">{{ t('components.dashed') }}</a-button>
        <a-button type="text">{{ t('components.text') }}</a-button>
        <a-button type="link">{{ t('components.link') }}</a-button>
        <a-button type="primary" danger>{{ t('components.danger') }}</a-button>
        <a-button type="primary" loading>{{ t('components.loading') }}</a-button>
        <a-button type="primary" disabled>{{ t('common.disabled') }}</a-button>
      </a-space>
    </a-card>

    <!-- 表单输入：移动端标签在上（单列），桌面端标签在左 -->
    <a-card :title="t('components.form')" class="section-card">
      <a-form
        :label-col="{ xs: 24, sm: 4 }"
        :wrapper-col="{ xs: 24, sm: 16 }"
        style="max-width: 720px"
      >
        <a-form-item :label="t('components.username')">
          <a-input v-model:value="form.username" :placeholder="t('components.usernamePlaceholder')" allow-clear />
        </a-form-item>
        <a-form-item :label="t('components.select')">
          <a-select
            v-model:value="form.selectValue"
            :placeholder="t('components.selectPlaceholder')"
            :options="[
              { value: 'a', label: t('components.optionA') },
              { value: 'b', label: t('components.optionB') },
              { value: 'c', label: t('components.optionC') },
            ]"
          />
        </a-form-item>
        <a-form-item :label="t('components.radio')">
          <a-radio-group v-model:value="form.radioValue">
            <a-radio value="a">A</a-radio>
            <a-radio value="b">B</a-radio>
            <a-radio value="c">C</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item :label="t('components.switch')">
          <a-switch v-model:checked="form.switchValue" />
        </a-form-item>
        <a-form-item :label="t('components.date')">
          <a-date-picker
            v-model:value="form.date"
            style="width: 100%; max-width: 200px"
            :placeholder="t('components.datePlaceholder')"
          />
        </a-form-item>
        <a-form-item :label="t('components.slider')">
          <a-slider v-model:value="form.sliderValue" style="width: 100%; max-width: 240px" />
        </a-form-item>
        <a-form-item :wrapper-col="{ xs: { span: 24, offset: 0 }, sm: { span: 16, offset: 4 } }">
          <a-space>
            <a-button type="primary" @click="handleSubmit">{{ t('components.submit') }}</a-button>
            <a-button @click="resetForm">{{ t('common.reset') }}</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 表格：移动端横向滚动 -->
    <a-card :title="t('components.table')" class="section-card">
      <a-table
        :columns="tableColumns"
        :data-source="tableData"
        :pagination="{ pageSize: 5 }"
        :scroll="{ x: 640 }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag v-if="record.status === 'warning'" color="warning">{{ t('components.warning') }}</a-tag>
            <a-tag v-else color="success">{{ t('components.normal') }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small">{{ t('common.edit') }}</a-button>
              <a-button type="link" size="small" danger>{{ t('common.delete') }}</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 反馈与展示 -->
    <a-card :title="t('components.feedback')" class="section-card">
      <a-space direction="vertical" size="large" style="width: 100%">
        <a-space wrap>
          <a-tag color="blue">{{ t('components.tagLabel') }}</a-tag>
          <a-tag color="green">{{ t('components.green') }}</a-tag>
          <a-tag color="red">{{ t('components.red') }}</a-tag>
          <a-badge :count="5">
            <a-avatar shape="square" style="background-color: #4c8bf5">A</a-avatar>
          </a-badge>
          <a-badge dot>
            <a-avatar shape="square" style="background-color: #52c41a">B</a-avatar>
          </a-badge>
        </a-space>

        <a-space direction="vertical" style="width: 100%">
          <a-alert :message="t('components.alertSuccess')" type="success" show-icon />
          <a-alert :message="t('components.alertInfo')" type="info" show-icon />
          <a-alert :message="t('components.alertWarning')" type="warning" show-icon />
        </a-space>

        <a-space wrap>
          <a-progress type="circle" :percent="75" />
          <a-progress type="dashboard" :percent="60" />
          <a-progress :percent="40" style="width: 100%; max-width: 240px" />
        </a-space>
      </a-space>
    </a-card>

    <!-- 其他常用 -->
    <a-card :title="t('components.other')" class="section-card">
      <a-space direction="vertical" size="large" style="width: 100%">
        <a-tabs
          :items="[
            { key: '1', label: 'Tab 1', children: t('components.tab1Content') },
            { key: '2', label: 'Tab 2', children: t('components.tab2Content') },
            { key: '3', label: 'Tab 3', children: t('components.tab3Content') },
          ]"
        />
        <a-space wrap>
          <a-tooltip :title="t('components.tooltip')">
            <a-button>{{ t('components.tooltipBtn') }}</a-button>
          </a-tooltip>
          <a-popconfirm :title="t('components.popconfirm')" :ok-text="t('components.ok')" :cancel-text="t('components.cancel')">
            <a-button danger>{{ t('components.popconfirmBtn') }}</a-button>
          </a-popconfirm>
          <a-dropdown
            :trigger="['click']"
            :menu="{
              items: [
                { key: '1', label: t('components.menuItem1') },
                { key: '2', label: t('components.menuItem2') },
                { key: '3', label: t('components.menuItem3') },
              ],
            }"
          >
            <a-button>{{ t('components.dropdownBtn') }}</a-button>
          </a-dropdown>
        </a-space>
        <a-space>
          <a-pagination :total="100" show-size-changer show-quick-jumper />
        </a-space>
      </a-space>
    </a-card>

    <!-- 抽屉 -->
    <a-card :title="t('components.drawer')" class="section-card">
      <a-space wrap>
        <a-button type="primary" @click="openDrawer('right')">{{ t('components.drawerRight') }}</a-button>
        <a-button @click="openDrawer('left')">{{ t('components.drawerLeft') }}</a-button>
        <a-button @click="openDrawer('top')">{{ t('components.drawerTop') }}</a-button>
        <a-button @click="openDrawer('bottom')">{{ t('components.drawerBottom') }}</a-button>
      </a-space>
      <a-drawer
        v-model:open="drawerOpen"
        :placement="drawerPlacement"
        :title="t('components.drawerTitle')"
        :size="drawerPlacement === 'left' || drawerPlacement === 'right' ? 378 : 256"
        :root-style="{ maxWidth: '100vw' }"
      >
        <p>{{ t('components.drawerP1') }}</p>
        <p style="margin-top: 12px">{{ t('components.drawerP2') }}</p>
        <a-space style="margin-top: 16px">
          <a-button type="primary" @click="drawerOpen = false">{{ t('components.ok') }}</a-button>
          <a-button @click="drawerOpen = false">{{ t('components.cancel') }}</a-button>
        </a-space>
      </a-drawer>
    </a-card>

    <!-- 结果页 -->
    <a-card :title="t('components.result')" class="section-card">
      <a-radio-group v-model:value="resultStatus" class="result-radio-group">
        <a-radio-button value="success">{{ t('components.resSuccess') }}</a-radio-button>
        <a-radio-button value="error">{{ t('components.resError') }}</a-radio-button>
        <a-radio-button value="warning">{{ t('components.resWarning') }}</a-radio-button>
        <a-radio-button value="info">{{ t('components.resInfo') }}</a-radio-button>
        <a-radio-button value="404">404</a-radio-button>
        <a-radio-button value="403">403</a-radio-button>
        <a-radio-button value="500">500</a-radio-button>
      </a-radio-group>
      <div style="margin-top: 16px">
        <a-result
          v-if="resultStatus === 'success'"
          status="success"
          :title="t('components.opSuccess')"
          :sub-title="t('components.opSuccessDesc')"
        >
          <template #extra>
            <a-button type="primary" @click="message.success(t('components.opSuccess'))">{{ t('components.repeat') }}</a-button>
          </template>
        </a-result>
        <a-result
          v-else-if="resultStatus === 'error'"
          status="error"
          :title="t('components.opError')"
          :sub-title="t('components.opErrorDesc')"
        >
          <template #extra>
            <a-button type="primary" danger>{{ t('components.backEdit') }}</a-button>
          </template>
        </a-result>
        <a-result
          v-else-if="resultStatus === 'warning'"
          status="warning"
          :title="t('components.opWarning')"
          :sub-title="t('components.opWarningDesc')"
        />
        <a-result
          v-else-if="resultStatus === 'info'"
          status="info"
          :title="t('components.opInfo')"
          :sub-title="t('components.opInfoDesc')"
        />
        <a-result
          v-else-if="resultStatus === '404'"
          status="404"
          title="404"
          :sub-title="t('notFound.subtitle')"
        >
          <template #extra>
            <a-button type="primary" @click="message.info(t('notFound.back'))">{{ t('notFound.back') }}</a-button>
          </template>
        </a-result>
        <a-result v-else-if="resultStatus === '403'" status="403" title="403" :sub-title="t('components.noPermission')" />
        <a-result v-else status="500" title="500" :sub-title="t('components.serverError')" />
      </div>
    </a-card>

    <!-- 空状态 -->
    <a-card :title="t('components.empty')" class="section-card">
      <a-space size="large" align="start" wrap>
        <div style="width: 200px; max-width: 100%">
          <a-empty :description="t('components.emptyDefault')" />
        </div>
        <div style="width: 200px; max-width: 100%">
          <a-empty image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg" :description="t('components.emptyCustom')" />
        </div>
        <div style="width: 200px; max-width: 100%">
          <a-empty>
            <template #description>
              <span>{{ t('components.emptySlot') }}</span>
            </template>
            <a-button type="primary" size="small">{{ t('components.create') }}</a-button>
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
