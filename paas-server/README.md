# AntX PaaS

一个可自托管的轻量 PaaS：接入 Git 仓库或容器镜像，平台完成构建、发布、运行、日志与回滚。

- 前端：Vue 3 + Vite + Pinia + Vue Router + AntdvNext（基于仓库内 `vue/` 模板）
- 后端：Node.js 22 + Express + node:sqlite（无额外数据库依赖）
- 执行层：真实 Docker（dockerode，支持本机 socket 与远程 Docker API），无 Docker 权限时自动降级为本地模拟驱动

## 目录结构

```
app-project/
├── vue/                 # 控制台前端（模板 + PaaS 页面）
│   └── src/views/paas/  # 总览 / 应用列表 / 应用详情 / 表单 / 日志终端
└── paas-server/         # PaaS 服务端
    ├── src/executor/    # docker 驱动、mock 驱动
    ├── src/routes/      # auth / apps / overview API
    ├── src/deploy.js    # 部署流水线（克隆→构建→启动→回滚）
    └── data/            # 运行时生成：SQLite 与构建工作目录（不入库）
```

## 快速开始

### 1. 启动服务端

```bash
cd paas-server
cp .env.example .env      # 按需修改管理员账号与执行层配置
npm install
npm run dev               # 默认 http://localhost:8080
```

首次启动会自动创建管理员账号（默认 `admin / admin123456`，请立即修改）。
执行层默认 `auto`：探测 Docker 成功则使用真实容器，否则降级为模拟驱动并在总览页提示。

### 2. 启动前端（开发模式）

```bash
cd vue
npm install
npm run dev               # 默认 http://localhost:3000，/api 代理到 8099
```

> `.env.development` 的 `VITE_PROXY_TARGET` 指向 `http://localhost:8099`，
> 若服务端使用默认 8080，请同步修改。

### 3. 生产部署

```bash
cd vue && npm run build                       # 产物在 vue/dist
cd ../paas-server && NODE_ENV=production npm start
```

`NODE_ENV=production` 时服务端会直接托管 `vue/dist`，前后端同域，无需额外 Nginx。

也可以用 Docker Compose 部署：

```bash
docker compose up -d --build
```

Compose 已挂载 `/var/run/docker.sock`——平台创建的容器会运行在宿主机 Docker 上，
与平台容器是兄弟关系，这是自托管 PaaS 的常见部署方式。

## 配置项（paas-server/.env）

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `PORT` | 服务端口 | `8080` |
| `PAAS_EXECUTOR` | `auto` / `docker` / `mock` | `auto` |
| `DOCKER_MODE` | `socket`（本机）或 `tcp`（远程 Docker API） | `socket` |
| `DOCKER_SOCKET` | 本机 Docker socket 路径 | `/var/run/docker.sock` |
| `DOCKER_HOST` | 远程 Docker 地址，如 `tcp://10.0.0.2:2375` | 空 |
| `PAAS_PUBLIC_HOST` | 对外访问域名，用于拼接应用地址 | 空（用 `localhost:宿主端口`） |
| `PAAS_PORT_RANGE_START` | 应用宿主机端口起始值 | `20000` |
| `PAAS_ADMIN_USER` / `PAAS_ADMIN_PASSWORD` | 首次启动创建的管理员 | `admin` / `admin123456` |

> 远程 Docker 建议通过 TLS 或内网专线暴露，不要把 2375 明文端口暴露到公网。

## 部署能力

1. **Git 源码**：按分支 `git clone --depth 1` → 使用仓库内 `Dockerfile` 构建镜像（标签 `antx-paas/<slug>:<版本号>`）→ 启动容器。
2. **容器镜像**：直接拉取并运行已有镜像，适合已有 CI 产物的场景。
3. **运行时**：按 CPU / 内存配额启动，`unless-stopped` 重启策略，宿主端口自动分配。
4. **观测**：容器日志 SSE 实时推送；CPU、内存、网络流量轮询展示。
5. **发布**：每次部署生成不可变版本记录，支持一键回滚到历史运行版本（复用旧镜像，不重新构建）。
6. **配置**：按应用维护环境变量，部署时注入容器。

## API 概览

统一返回体 `{ code, data, message }`，登录态使用 HttpOnly 会话 Cookie。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/login` | 账号登录 |
| POST | `/api/auth/logout` | 退出登录 |
| GET | `/api/bff/me` | 当前登录态（兼容模板 BFF 约定） |
| GET | `/api/paas/overview` | 总览统计 |
| GET/POST | `/api/paas/apps` | 应用列表 / 创建 |
| GET/PUT/DELETE | `/api/paas/apps/:id` | 详情 / 更新 / 删除 |
| POST | `/api/paas/apps/:id/deploy` | 触发部署 |
| POST | `/api/paas/apps/:id/rollback` | 回滚到指定部署 |
| POST | `/api/paas/apps/:id/actions` | 启动 / 停止 / 重启 |
| GET | `/api/paas/apps/:id/metrics` | 运行指标 |
| GET | `/api/paas/apps/:id/logs` | 运行日志（SSE） |
| GET | `/api/paas/deployments/:id/stream` | 部署日志（SSE） |

## 模拟驱动说明

当环境没有 Docker 权限（如受限容器）时，`auto` 会降级为 `mock`：

- 完整复现构建、启动、停止、日志、指标、回滚的控制台流程；
- 容器状态仅存内存，**服务重启后需要重新部署**；
- 总览页会显示降级原因，便于区分演示与真实运行。

生产环境请确保 Docker 可用，并设置 `PAAS_EXECUTOR=docker`，让不可用时直接报错而不是静默降级。

## 安全提示

- 首次登录后请修改默认管理员密码；生产环境通过 `PAAS_ADMIN_PASSWORD` 指定强密码。
- 平台以服务端身份调用 Docker API，等同于宿主机权限，请只对内网或可信用户开放。
- 环境变量以明文存于 SQLite，敏感配置建议使用独立的密钥管理方案。
