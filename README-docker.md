# AntX 模板 Docker 化部署

把 `app-project`（Spring Boot 4 后端 + Vue3 前端 + MySQL + Redis）一键容器化。**整套是一个可复制复用的模板**，每个新应用复制一份并改 `.env` 即可。

## 组成

| 服务 | 镜像 | 说明 |
|------|------|------|
| `mysql` | mysql:8.4 | 数据库，首次启动自动建库建表（挂载 `api/.../sql/init.sql`） |
| `redis` | redis:7-alpine | 缓存 + Spring Session 会话存储 |
| `api` | 自构建（maven + jre17） | Spring Boot 后端，`prod` profile，环境变量注入连接 |
| `web` | 自构建（node + nginx） | Vue 静态资源 + nginx 反向代理 `/api` `/oauth2` `/login` 到后端 |

## 目录结构（新增的 Docker 相关文件）

```
app-project/
├── docker-compose.yml          # 编排（四服务）
├── .env                        # 实际配置（含密码，勿提交 git）
├── .env.example                # 配置示例（复制为 .env）
├── README-docker.md            # 本文档
├── api/
│   ├── Dockerfile              # 后端多阶段构建
│   └── .dockerignore
└── web/
    ├── Dockerfile              # 前端多阶段构建（node 构建 + nginx 托管）
    ├── nginx.conf              # 反代配置
    └── .dockerignore
```

## 快速开始（在装有 Docker 的 Linux 服务器上）

```bash
# 1. 进入模板目录
cd app-project

# 2. 配置环境变量
cp .env.example .env
vi .env        # 修改 COMPOSE_PROJECT_NAME、MYSQL_ROOT_PASSWORD、SSO_* 等

# 3. 构建并启动（首次会拉镜像 + 构建，耗时较长）
docker compose up -d --build

# 4. 查看状态
docker compose ps

# 5. 访问
# 浏览器打开 http://<服务器IP>:${WEB_PORT}（默认 80）
```

> 前端 Nginx 对外默认 **80** 端口；`/api`、`/oauth2`、`/login` 已同源反代到后端，浏览器只需访问 Web 端口一个地址。

## 每个新应用如何复用

1. 复制整个 `app-project` 目录为你的新应用目录（如 `app-project-vpn`）。
2. 修改新目录下的 `.env`：
   - `COMPOSE_PROJECT_NAME`：改成新应用名（如 `antx-vpn`），容器名/卷名随之隔离，互不冲突。
   - `MYSQL_ROOT_PASSWORD`：换成新强密码。
   - `SSO_*`：注册新应用的 client-id/secret、issuer、登录成功跳转地址。
   - 如改了 `MYSQL_DATABASE`，同步改 `api/src/main/resources/sql/init.sql` 里的 `USE 库名;`。
3. `docker compose up -d --build` 启动。

## SSO 配置要点

- `SSO_ISSUER` 等必须填 **api 容器可访问**的地址（容器内 `localhost` 是 api 容器自身，无法访问宿主机/外部 SSO）。用域名或局域网/公网 IP。
- 需在 SSO 控制台注册本应用，`redirect_uri` 登记为：
  ```
  http://<你的域名或IP>:<WEB_PORT>/login/oauth2/code/sso
  ```
- 不接 SSO 时：可用 `.env` 里的 `SECURITY_ADMIN_USERNAME / SECURITY_ADMIN_PASSWORD`（默认 admin/admin123）走 httpBasic 联调后端接口。

## 常用命令

```bash
docker compose up -d --build   # 构建并后台启动
docker compose ps              # 查看状态
docker compose logs -f api     # 查看后端日志
docker compose logs -f web     # 查看前端/nginx 日志
docker compose down            # 停止并删除容器（保留数据卷）
docker compose down -v         # 停止并删除容器 + 数据卷（数据丢失，慎用）
```

## 数据持久化

- `mysql-data`、`redis-data` 为命名卷，`down` 不删数据，重启/重建容器数据都在。
- 数据库只在**首次启动**（卷为空）时执行 `init.sql`；之后改 `init.sql` 不会自动重跑，需手动在容器内执行或重建卷。

## 常见问题

**Q：如何改用外部已有的 MySQL / Redis，而不是容器内自带的？**
在 `docker-compose.yml` 的 `api.environment` 中，把 `DB_URL` 的主机改为外部地址（如 `jdbc:mysql://192.168.1.10:3306/...`），`REDIS_HOST` 改为外部 Redis 地址；并删除/注释 `depends_on` 与 `api` 对 mysql/redis 的依赖。数据库表仍需先初始化（执行 `init.sql`）。

**Q：改了 Java/Vue 代码如何生效？**
```bash
docker compose up -d --build
```
`--build` 会重新构建镜像（Maven/Node 构建已做依赖缓存，二次构建较快）。

**Q：服务器内存/性能**
后端 JVM 默认使用容器可用内存。如需限制，可在 `api` 服务加：
```yaml
deploy:
  resources:
    limits:
      memory: 512M
```

**Q：域名访问 / HTTPS**
`WEB_PORT` 对外默认 80。若需 HTTPS，推荐在宿主机或前置网关用 Nginx/Caddy 反代到 `WEB_PORT`，并相应配置 `SSO_ISSUER`、`SSO_LOGIN_SUCCESS_URL` 为 HTTPS 地址。
