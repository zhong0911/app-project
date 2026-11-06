import crypto from 'node:crypto'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 本地模拟执行层：在没有 Docker 权限的环境下提供与真实驱动一致的行为，
 * 便于完整验证控制台流程；状态仅保存在内存中，进程重启后清空。
 */
export class MockExecutor {
  constructor() {
    this.type = 'mock'
    this.containers = new Map()
    this.counters = new Map()
  }

  describe() {
    return { type: 'mock', target: 'local-simulator' }
  }

  async version() {
    return 'simulator-1.0'
  }

  async build({ tag, onLog }) {
    const steps = [
      '解析构建上下文',
      '检测到 Dockerfile，使用 docker build 构建',
      '#1 [internal] load build definition',
      '#2 [internal] load metadata for docker.io/library/node:22-alpine',
      '#3 [1/6] FROM docker.io/library/node:22-alpine',
      '#4 [2/6] WORKDIR /app',
      '#5 [3/6] COPY package.json ./',
      '#6 [4/6] RUN npm ci --omit=dev',
      '#7 [5/6] COPY . .',
      '#8 [6/6] RUN npm run build',
      '#9 exporting to image',
    ]
    for (const step of steps) {
      await sleep(220)
      onLog(step)
    }
    await sleep(300)
    onLog(`镜像 ${tag} 构建完成`)
  }

  async pullImage(image, onLog) {
    onLog(`拉取镜像 ${image}`)
    await sleep(400)
    onLog(`镜像 ${image} 已就绪`)
  }

  async run({ containerName, image, app, hostPort, onLog }) {
    const id = crypto.randomBytes(32).toString('hex')
    const container = {
      id,
      name: containerName,
      image,
      appId: app.id,
      app: { ...app },
      status: 'running',
      startedAt: new Date().toISOString(),
      logBuffer: [],
      memoryMb: Number(app.memoryMb || 512),
      cpu: 2 + Math.random() * 8,
      memory: Math.min(120, Math.round(Number(app.memoryMb || 512) * (0.2 + Math.random() * 0.3))),
    }
    this.containers.set(id, container)
    this.startLogging(container, app)
    onLog(`容器已启动 ${id.slice(0, 12)}，映射端口 ${hostPort} → ${app.port}`)
    return { containerId: id }
  }

  startLogging(container, app) {
    const lines = [
    `[info] starting ${app.name} v1`,
    `[info] listening on 0.0.0.0:${app.port}`,
    `[info] environment=${Object.keys(app.env || {}).length} vars loaded`,
    '[info] health check passed',
    ]
    for (const line of lines) container.logBuffer.push(line)
    const requests = [
      'GET /health 200 1.2ms',
      'GET / 200 4.8ms',
      'POST /api/items 201 12.4ms',
      'GET /static/app.js 200 2.1ms',
      'GET /health 200 0.9ms',
    ]
    container.timer = setInterval(() => {
      if (container.status !== 'running') return
      const req = requests[Math.floor(Math.random() * requests.length)]
      const ip = `10.0.${Math.floor(Math.random() * 4)}.${Math.floor(Math.random() * 250)}`
      container.logBuffer.push(`${ip} - "${req}"`)
      if (container.logBuffer.length > 500) container.logBuffer.shift()
      container.cpu = Math.max(0.4, Math.min(35, container.cpu + (Math.random() - 0.5) * 4))
      container.memory = Math.max(
        40,
        Math.min(Number(app.memoryMb || 512), container.memory + (Math.random() - 0.5) * 12),
      )
    }, 2500)
  }

  async stop(containerId) {
    const container = this.containers.get(containerId)
    if (!container) return
    container.status = 'exited'
    container.logBuffer.push('[info] received SIGTERM, shutting down gracefully')
    clearInterval(container.timer)
  }

  async remove(containerId) {
    const container = this.containers.get(containerId)
    if (container) clearInterval(container.timer)
    this.containers.delete(containerId)
  }

  async restart(containerId) {
    const container = this.containers.get(containerId)
    if (!container) throw new Error('容器不存在')
    container.status = 'running'
    container.startedAt = new Date().toISOString()
    container.logBuffer.push('[info] container restarted')
    if (!container.timer) this.startLogging(container, container.app || {})
  }

  async inspect(containerId) {
    const container = this.containers.get(containerId)
    if (!container) return { status: 'missing', running: false }
    return {
      status: container.status === 'running' ? 'running' : 'exited',
      running: container.status === 'running',
      startedAt: container.startedAt,
    }
  }

  async *logs(containerId, { tail = 200, signal } = {}) {
    const container = this.containers.get(containerId)
    if (!container) return
    for (const line of container.logBuffer.slice(-tail)) yield line
    let index = container.logBuffer.length
    while (!signal?.aborted) {
      await sleep(800)
      while (index < container.logBuffer.length) {
        yield container.logBuffer[index]
        index += 1
      }
      if (container.status !== 'running' && index >= container.logBuffer.length) return
    }
  }

  async stats(containerId) {
    const container = this.containers.get(containerId)
    if (!container || container.status !== 'running') {
      return { cpuPercent: 0, memoryMb: 0, memoryLimitMb: 0, networkRxMb: 0, networkTxMb: 0 }
    }
    return {
      cpuPercent: Number(container.cpu.toFixed(1)),
      memoryMb: Math.round(container.memory),
      memoryLimitMb: Number(container.memoryMb || 512),
      networkRxMb: Number((container.logBuffer.length * 0.02).toFixed(2)),
      networkTxMb: Number((container.logBuffer.length * 0.01).toFixed(2)),
    }
  }
}
