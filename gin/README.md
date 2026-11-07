# AntX Gin(Go) 后端模板

对标 `springboot/` 的等价实现：Entity / DTO / VO / Repository / Service / Handler 分层，自带统一响应、用户管理、SSO 接入。

## 目录结构

```
gin/
├── cmd/server/main.go              # 入口（= TemplateApplication，显式依赖装配）
├── internal/
│   ├── handler/                    # 控制器（= controller/，薄层）
│   │   ├── sso_handler.go          #   /sso/authorize、/sso/callback
│   │   ├── auth_handler.go         #   /api/auth/me、/api/auth/logout
│   │   ├── bff_handler.go          #   /api/bff/me
│   │   ├── user_handler.go         #   /api/users
│   │   ├── admin_user_handler.go   #   /api/admin/users
│   │   ├── demo_handler.go         #   /api/demo
│   │   └── common.go               #   参数绑定 / 错误写出等公共逻辑
│   ├── middleware/                 # 身份解析、登录校验、管理员校验、CORS、Recovery
│   ├── model/
│   │   ├── entity/user.go          #   实体（= entity/）
│   │   ├── dto/user_dto.go         #   入参 DTO
│   │   └── vo/user_vo.go           #   出参 VO
│   ├── repository/user_repo.go     # 仓储层（= mapper/）
│   ├── service/user_service.go     # 业务层（= service/impl/）
│   ├── session/store.go            # 服务端会话（SSO token 存这里）
│   ├── errno/errno.go              # ResultCode + BusinessError
│   └── router/router.go            # 路由注册（= @RequestMapping）
├── pkg/
│   ├── config/config.go            # 配置（= application.yml + .env）
│   ├── database/database.go        # 连接池（= DataSource）
│   ├── response/result.go          # Result / PageResult
│   └── sso/sso.go                  # OAuth2 客户端 + JWKS 验签 + revoke
├── configs/.env.example            # 环境变量示例
├── sql/init.sql                    # 建表 + 初始管理员
├── go.mod
└── go.sum
```

## 启动

```bash
cd gin
cp configs/.env.example configs/.env
mysql -uroot -p < sql/init.sql
go mod tidy
go run ./cmd/server
```

## 与 Spring Boot 的对应关系

| Spring Boot | Gin |
| --- | --- |
| `TemplateApplication` | `cmd/server/main.go` |
| `@RestController` | `internal/handler/*` |
| `@Service` | `internal/service/*` |
| `@Mapper` | `internal/repository/*` |
| `entity/` | `internal/model/entity/` |
| `dto/` + `@Valid` | `internal/model/dto/` + `binding` tag |
| `vo/` | `internal/model/vo/` |
| `Result/PageResult` | `pkg/response/result.go` |
| `@RestControllerAdvice` | `internal/middleware/recovery.go` + `errno` |
| `SecurityConfig` + `@PreAuthorize` | `internal/middleware/auth.go`（`RequireLogin` / `RequireAdmin`） |
| `DataSource` | `pkg/database/database.go`（database/sql 连接池） |
| `application.yml` | `pkg/config` + `configs/.env` |

## 接口一览

统一返回 `{code, success, message, data, timestamp}`，HTTP 状态恒 200。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/sso/authorize` | 302 跳 SSO 登录页 |
| GET | `/sso/callback` | 回调：换 token、写会话、注册默认用户、跳成功页 |
| GET | `/api/auth/me` | 当前登录用户 |
| POST | `/api/auth/logout` | 撤销 token + 销毁会话 |
| GET | `/api/bff/me` | 聚合登录态 |
| GET/POST/PUT/DELETE | `/api/users`、`/api/users/:id` | 用户 CRUD + 分页 |
| GET/POST | `/api/admin/users`、`/api/admin/users/recycle` | 管理端列表 / 回收站 |
| PUT | `/api/admin/users/:id/status` | 启用 / 禁用 |
| DELETE | `/api/admin/users/:id`、`/purge` | 软删除 / 彻底删除 |
| POST | `/api/admin/users/:id/restore` | 恢复 |
| GET | `/api/demo/admin`、`/api/demo/user` | 权限示例 |
| GET | `/health` | 健康检查 |

## 三种登录态

1. `sso-login`：浏览器会话（`/sso/authorize` 登录后）
2. `sso-jwt`：请求头 `Authorization: Bearer <access_token>`，用 JWKS 验签
3. `basic`：本地联调 `Authorization: Basic base64(admin:admin123)`，`SECURITY_BASIC_ENABLED=false` 可关闭

## SSO 接入

1. SSO 控制台注册应用，拿 client-id / client-secret，登记回调 `http://localhost:8080/sso/callback`
2. `configs/.env` 填 `SSO_CLIENT_ID` / `SSO_CLIENT_SECRET` / `SSO_ISSUER`
3. 本地 `users.uid` = SSO 用户 id；`SSO_ADMIN_UID=1` 为默认管理员

- 方案B：SSO 只认证，`users.role` 决定子应用权限；本地查不到 = 未注册 = 403
- 登出先 revoke `refresh_token`（没有则 `access_token`），再销毁会话，返回 `ssoLogoutUrl`
- 生产：`SECURITY_BASIC_ENABLED=false`、会话 store 换 Redis、CORS 写具体域名

## 自检

```bash
gofmt -l . && go build ./... && go vet ./...
```
