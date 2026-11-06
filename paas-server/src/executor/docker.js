import fs from 'node:fs'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import dockerode from 'dockerode'
import tar from 'tar-stream'
import { config } from '../config.js'

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.cache', '.idea', '.vscode'])

/** 把构建上下文打包成 tar 流（docker build 需要） */
function createContextTar(dir) {
  const pack = tar.pack()
  const walk = (current, prefix = '') => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.env')) continue
      const full = path.join(current, entry.name)
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        walk(full, name)
      } else if (entry.isSymbolicLink()) {
        continue
      } else {
        pack.entry({ name }, fs.readFileSync(full))
      }
    }
  }
  try {
    walk(dir)
  } catch (error) {
    pack.destroy(error)
    return pack
  }
  pack.finalize()
  return pack
}

function dockerClient() {
  if (config.docker.mode === 'tcp') {
    const raw = (config.docker.host || '').replace(/^tcp:\/\//, '').replace(/^http:\/\//, '')
    const [hostname, port = '2375'] = raw.split(':')
    return new dockerode({ host: hostname, port: Number(port) })
  }
  return new dockerode({ socketPath: config.docker.socketPath })
}

export class DockerExecutor {
  constructor() {
    this.type = 'docker'
    this.docker = dockerClient()
  }

  describe() {
    return {
      type: 'docker',
      target: config.docker.mode === 'tcp' ? config.docker.host : `unix://${config.docker.socketPath}`,
    }
  }

  async version() {
    const info = await this.docker.version()
    return info.Version
  }

  async pullImage(image, onLog) {
    onLog(`拉取镜像 ${image}`)
    const stream = await this.docker.pull(image)
    await new Promise((resolve, reject) => {
      this.docker.modem.followProgress(
        stream,
        (error, output) => {
          if (error) return reject(error)
          const failed = (output || []).find((item) => item.error)
          if (failed) return reject(new Error(failed.error))
          resolve()
        },
        (event) => {
          if (event.status) onLog(`${event.status}${event.progress ? ` ${event.progress}` : ''}`)
        },
      )
    })
  }

  async build({ contextDir, tag, dockerfile = 'Dockerfile', onLog }) {
    const file = path.join(contextDir, dockerfile)
    if (!fs.existsSync(file)) {
      throw new Error(`未找到 Dockerfile：${dockerfile}`)
    }
    onLog(`开始构建镜像 ${tag}`)
    const stream = await this.docker.buildImage(createContextTar(contextDir), {
      t: tag,
      dockerfile,
      labels: { 'antx.paas': 'true' },
    })
    await new Promise((resolve, reject) => {
      this.docker.modem.followProgress(
        stream,
        (error, output) => {
          if (error) return reject(error)
          const failed = (output || []).find((item) => item.error)
          if (failed) return reject(new Error(failed.errorDetail?.message || failed.error))
          resolve()
        },
        (event) => {
          if (event.stream) onLog(event.stream.replace(/\n$/, ''))
          else if (event.status) onLog(`${event.status}${event.progress ? ` ${event.progress}` : ''}`)
        },
      )
    })
    onLog(`镜像构建完成 ${tag}`)
  }

  async run({ containerName, image, app, hostPort, onLog }) {
    try {
      await this.docker.getContainer(containerName).remove({ force: true })
    } catch {
      // 不存在则忽略
    }
    const env = Object.entries(app.env || {}).map(([key, value]) => `${key}=${value}`)
    env.push(`PAAS_APP_ID=${app.id}`, `PAAS_APP_SLUG=${app.slug}`, `PORT=${app.port}`)

    const hostConfig = {
      PortBindings: { [`${app.port}/tcp`]: [{ HostPort: String(hostPort) }] },
      RestartPolicy: { Name: 'unless-stopped' },
      NanoCpus: Math.round(Number(app.cpu || 0.5) * 1e9),
      Memory: Number(app.memoryMb || 512) * 1024 * 1024,
    }
    const container = await this.docker.createContainer({
      name: containerName,
      Image: image,
      Env: env,
      ExposedPorts: { [`${app.port}/tcp`]: {} },
      Labels: { 'antx.paas.app': String(app.id), 'antx.paas.slug': app.slug },
      HostConfig: hostConfig,
    })
    await container.start()
    onLog(`容器已启动 ${container.id.slice(0, 12)}，映射端口 ${hostPort} → ${app.port}`)
    return { containerId: container.id }
  }

  async stop(containerId) {
    if (!containerId) return
    const container = this.docker.getContainer(containerId)
    try {
      await container.stop({ t: 10 })
    } catch (error) {
      if (error.statusCode !== 304 && error.statusCode !== 404) throw error
    }
  }

  async remove(containerId) {
    if (!containerId) return
    try {
      await this.docker.getContainer(containerId).remove({ force: true })
    } catch (error) {
      if (error.statusCode !== 404) throw error
    }
  }

  async restart(containerId) {
    await this.docker.getContainer(containerId).restart({ t: 10 })
  }

  async inspect(containerId) {
    const info = await this.docker.getContainer(containerId).inspect()
    return {
      status: info.State?.Status || 'unknown',
      running: !!info.State?.Running,
      startedAt: info.State?.StartedAt,
      exitCode: info.State?.ExitCode,
    }
  }

  /** 容器日志流：逐行产出 */
  async *logs(containerId, { tail = 200 } = {}) {
    const stream = await this.docker.getContainer(containerId).logs({
      stdout: true,
      stderr: true,
      follow: true,
      tail,
      timestamps: false,
    })
    const output = new PassThrough()
    this.docker.modem.demuxStream(stream, output, output)
    for await (const chunk of output) {
      const text = chunk.toString('utf8')
      for (const line of text.split('\n')) {
        if (line.trim()) yield line
      }
    }
  }

  async stats(containerId) {
    const stats = await this.docker.getContainer(containerId).stats({ stream: false })
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
    const cores = stats.cpu_stats.online_cpus || 1
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * cores * 100 : 0
    return {
      cpuPercent: Number(Math.max(0, cpuPercent).toFixed(1)),
      memoryMb: Number((stats.memory_stats.usage / 1024 / 1024).toFixed(1)),
      memoryLimitMb: Number((stats.memory_stats.limit / 1024 / 1024).toFixed(1)),
      networkRxMb: Number(((stats.networks?.eth0?.rx_bytes || 0) / 1024 / 1024).toFixed(1)),
      networkTxMb: Number(((stats.networks?.eth0?.tx_bytes || 0) / 1024 / 1024).toFixed(1)),
    }
  }
}
