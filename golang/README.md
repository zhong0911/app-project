# AntX Go 后端模板（对标 Node.js / Spring Boot 模板）

使用 **Go 1.22+ 标准库 `net/http`（ServeMux 方法路由）+ database/sql + go-sql-driver/mysql** 实现，
不依赖 Web 框架，行为与 `nodejs` 模板保持一致：统一 `Result` 响应、分页 `PageResult`、
OAuth2 授权码登录（AntX SSO）、BFF 登录态与管理后台用户管理。

## 目录结构

```
golang/
├── go.mod / go.sum
├── main.go                     # 入口：配置 + MySQL 连接池 + HTTP 服务
├── internal/
│   ├── config/                 # 环境变量（PORT / DB_* / SSO_*）
│   ├── result/                 # Result / PageResult / ResultCode / BusinessException
│   ├── db/                     # MySQL 连接池
│   ├── repo/                   # users 表仓储（分页、软删除、回收站）
│   ├── sso/                    # OAuth2 客户端、state、内存会话、JWT sub 解析、Cookie
│   ├── auth/                   # 当前 uid 解析与管理员鉴权
│   └── handler/                # 路由与控制器（health / users / admin / bff / sso / logout）
├── sql/init.sql                # users 表初始化
├── .env.example
└── README.md
```

## 运行

```bash
cp .env.example .env
set -a; source .env; set +a     # 导出环境变量（程序直接读取环境变量）

go run .
# 或
go build -o app . && ./app
```

初始化数据库（MySQL）：

```bash
mysql -u root -p < sql/init.sql
```

## 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| `PORT` | 服务端口 | `8080` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | MySQL 连接 | `127.0.0.1` / `3306` / `antx_template` / `root` / 空 |
| `SSO_CLIENT_ID` / `SSO_CLIENT_SECRET` | SSO 应用凭证（client_id 为空时 `/sso/*` 返回 404） | 空 |
| `SSO_ISSUER` | 授权服务器地址；端点留空时推导标准路径 | 空 |
| `SSO_AUTHORIZATION_URI` / `SSO_TOKEN_URI` / `SSO_USERINFO_URI` / `SSO_REVOKE_URI` | 显式端点（可留空） | 空 |
| `SSO_SCOPE` | 授权范围 | `openid,profile,email,roles,permissions` |
| `SSO_LOGIN_SUCCESS_URL` | 登录成功重定向地址 | `/` |
| `SSO_LOGOUT_URI` | 返回给前端整页跳转的 SSO 登出地址 | 空（返回 `null`） |
| `SSO_ADMIN_UID` | 管理员 SSO uid | `1` |
| `SESSION_COOKIE_SECURE` | 为 `true` 时 Cookie 追加 `Secure` | `false` |

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 `{"status":"up","service":"golang"}` |
| GET | `/sso/authorize` | 生成随机 state，302 跳转授权服务器 |
| GET | `/sso/callback` | 校验并消费 state、code 换 token、建立服务端会话、302 登录成功页 |
| POST | `/api/auth/logout` | 撤销 refresh_token（无则 access_token）、销毁会话、清 Cookie，返回 `{"ssoLogoutUrl":...}` |
| GET | `/api/bff/me` | 未登录 401；否则返回 `authType/uid/name/role/isAdmin/status/localId` |
| GET | `/api/admin/users` | 用户列表，支持 `pageNum/pageSize/uid/status`，`deleted=0` |
| POST | `/api/admin/users` | 添加用户，body `{"uid":"..."}` |
| PUT | `/api/admin/users/{id}/status` | 启用/禁用，body `{"status":0\|1}` |
| DELETE | `/api/admin/users/{id}` | 软删除（移入回收站） |
| GET | `/api/admin/users/recycle` | 回收站列表，`deleted=1` |
| POST | `/api/admin/users/{id}/restore` | 从回收站恢复 |
| DELETE | `/api/admin/users/{id}/purge` | 彻底删除 |
| POST / PUT / GET / DELETE | `/api/users`、`/api/users/{id}` | RESTful 用户示例（内存数据，对标 nodejs） |

管理接口鉴权：未登录 `401`，非管理员或禁用的管理员 `403`；身份键为 access_token 的 `sub`（= `users.uid`），
会话中保存的 token/uid 优先，`Authorization: Bearer <access_token>` 次之。

## 统一响应

```json
{
  "code": 200,
  "success": true,
  "message": "操作成功",
  "data": { "pageNum": 1, "pageSize": 10, "total": 2, "pages": 1, "records": [] },
  "timestamp": 1720000000000
}
```

- `data` 为 nil 时省略；错误同样使用该结构。
- HTTP 语义码：`400/401/403/404/500`；业务码：`1000` 业务异常、`1001` 数据冲突。
- 业务码段异常 HTTP 状态仍为 `200`（与 nodejs / springboot 一致）。

## 说明

- **会话与 state 均为进程内内存存储**，仅适用于模板/单实例开发；生产多实例请替换为 Redis（如 go-redis），
  以保证会话共享与重启不丢失。
- 回调地址需在 SSO 控制台登记为 `http(s)://<域名>:<端口>/sso/callback`。
