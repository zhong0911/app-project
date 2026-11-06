<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { MinusCircleOutlined, PlusOutlined } from '@antdv-next/icons'
import { createAppApi, updateAppApi } from '@/api/paas'
import { envToRows, rowsToEnv } from '@/utils/paas'
import { message } from '@/utils/app'

const props = defineProps({
  open: { type: Boolean, default: false },
  app: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'saved'])

const { t } = useI18n()
const saving = ref(false)

const form = reactive({
  name: '',
  sourceType: 'git',
  repoUrl: '',
  branch: 'main',
  dockerfile: 'Dockerfile',
  image: '',
  port: 80,
  cpu: 0.5,
  memoryMb: 512,
  autoDeploy: false,
})
const envRows = ref([])

const isEdit = computed(() => !!props.app?.id)
const title = computed(() => (isEdit.value ? t('paas.apps.editTitle') : t('paas.apps.createTitle')))

watch(
  () => props.open,
  (open) => {
    if (!open) return
    const app = props.app
    Object.assign(form, {
      name: app?.name || '',
      sourceType: app?.sourceType || 'git',
      repoUrl: app?.repoUrl || '',
      branch: app?.branch || 'main',
      dockerfile: app?.dockerfile || 'Dockerfile',
      image: app?.image || '',
      port: app?.port || 80,
      cpu: app?.cpu ?? 0.5,
      memoryMb: app?.memoryMb || 512,
      autoDeploy: !!app?.autoDeploy,
    })
    envRows.value = envToRows(app?.env || {})
  },
)

function addEnv() {
  envRows.value.push({ key: '', value: '' })
}

function removeEnv(index) {
  envRows.value.splice(index, 1)
}

function close() {
  emit('update:open', false)
}

async function submit() {
  if (!form.name.trim()) {
    message.warning(t('paas.apps.nameRequired'))
    return
  }
  const payload = {
    ...form,
    name: form.name.trim(),
    port: Number(form.port),
    cpu: Number(form.cpu),
    memoryMb: Number(form.memoryMb),
    env: rowsToEnv(envRows.value),
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await updateAppApi(props.app.id, payload)
    } else {
      await createAppApi(payload)
    }
    message.success(isEdit.value ? t('paas.apps.saveSuccess') : t('paas.apps.createSuccess'))
    emit('saved')
    close()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <a-modal
    :open="open"
    :title="title"
    :confirm-loading="saving"
    width="640px"
    :ok-text="t('paas.common.save')"
    :cancel-text="t('paas.common.cancel')"
    @ok="submit"
    @cancel="close"
  >
    <a-form layout="vertical" class="app-form">
      <a-form-item :label="t('paas.apps.name')" required>
        <a-input v-model:value="form.name" :placeholder="t('paas.apps.namePlaceholder')" :maxlength="40" />
      </a-form-item>

      <a-form-item :label="t('paas.apps.sourceType')">
        <a-segmented
          v-model:value="form.sourceType"
          :options="[
            { label: t('paas.apps.gitSource'), value: 'git' },
            { label: t('paas.apps.imageSource'), value: 'image' },
          ]"
          block
        />
      </a-form-item>

      <template v-if="form.sourceType === 'git'">
        <a-form-item :label="t('paas.apps.repoUrl')" required>
          <a-input v-model:value="form.repoUrl" placeholder="https://gitee.com/user/repo.git" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :xs="24" :sm="12">
            <a-form-item :label="t('paas.apps.branch')">
              <a-input v-model:value="form.branch" placeholder="main" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12">
            <a-form-item :label="t('paas.apps.dockerfile')">
              <a-input v-model:value="form.dockerfile" placeholder="Dockerfile" />
            </a-form-item>
          </a-col>
        </a-row>
      </template>

      <a-form-item v-else :label="t('paas.apps.image')" required>
        <a-input v-model:value="form.image" placeholder="nginx:alpine" />
      </a-form-item>

      <a-row :gutter="12">
        <a-col :xs="24" :sm="8">
          <a-form-item :label="t('paas.apps.port')" required>
            <a-input-number v-model:value="form.port" :min="1" :max="65535" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-form-item :label="t('paas.apps.cpu')">
            <a-input-number v-model:value="form.cpu" :min="0.1" :max="32" :step="0.1" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-form-item :label="t('paas.apps.memory')">
            <a-input-number v-model:value="form.memoryMb" :min="64" :max="32768" :step="64" style="width: 100%" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item :label="t('paas.apps.env')">
        <div class="env-editor">
          <div v-if="!envRows.length" class="env-empty">{{ t('paas.apps.envEmpty') }}</div>
          <a-row v-for="(row, index) in envRows" :key="index" :gutter="8" class="env-row">
            <a-col :span="10">
              <a-input v-model:value="row.key" placeholder="KEY" />
            </a-col>
            <a-col :span="12">
              <a-input v-model:value="row.value" placeholder="value" />
            </a-col>
            <a-col :span="2">
              <a-button type="text" danger @click="removeEnv(index)">
                <MinusCircleOutlined />
              </a-button>
            </a-col>
          </a-row>
          <a-button type="dashed" block @click="addEnv">
            <PlusOutlined />
            {{ t('paas.apps.addEnv') }}
          </a-button>
        </div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped>
.env-editor {
  width: 100%;
}

.env-row {
  margin-bottom: 8px;
}

.env-editor :deep(.ant-empty) {
  margin: 8px 0 12px;
}

.env-empty {
  color: var(--text-tertiary);
  font-size: 12px;
  margin: 4px 0 10px;
}
</style>
