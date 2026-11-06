import { config } from '../config.js'
import { logEvent } from '../db.js'
import { DockerExecutor } from './docker.js'
import { MockExecutor } from './mock.js'

let executor = null
let executorInfo = null

/** 初始化执行层：auto 模式下探测 Docker，不可用则降级为模拟驱动 */
export async function initExecutor() {
  if (config.executor === 'mock') {
    executor = new MockExecutor()
    executorInfo = { ...executor.describe(), version: await executor.version(), fallback: false }
    logEvent(null, 'warn', '执行层使用本地模拟驱动（PAAS_EXECUTOR=mock）')
    return executor
  }
  const docker = new DockerExecutor()
  try {
    const version = await docker.version()
    executor = docker
    executorInfo = { ...docker.describe(), version, fallback: false }
    logEvent(null, 'info', `执行层连接 Docker 成功（${executorInfo.target}，v${version}）`)
    return executor
  } catch (error) {
    if (config.executor === 'docker') {
      throw new Error(`Docker 不可用：${error.message}（可设置 PAAS_EXECUTOR=mock 使用模拟驱动）`)
    }
    executor = new MockExecutor()
    executorInfo = { ...executor.describe(), version: await executor.version(), fallback: true, reason: error.message }
    logEvent(null, 'warn', `Docker 不可用，降级为模拟驱动：${error.message}`)
    return executor
  }
}

export function getExecutor() {
  if (!executor) throw new Error('执行层尚未初始化')
  return executor
}

export function getExecutorInfo() {
  return executorInfo
}
