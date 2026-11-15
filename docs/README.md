# AntX 全栈模板文档索引

一个仓库放齐 **1 套契约（Spring Boot）+ 6 套等价后端 + 1 套前端模板**，所有后端接口面、响应结构、用户模型、SSO 接入方式完全一致，换语言不改前端。

## 文档

| 文档 | 内容 |
| --- | --- |
| [后端模板对照总表](./后端模板对照总表.md) | 7 套后端的分层对照、统一接口面、响应契约、用户模型、SSO 核对清单、自检结果 |
| [springboot/docs/sso-接入核对.md](../springboot/docs/sso-接入核对.md) | SSO 接入的逐步核对项（契约来源） |

## 目录一览

| 目录 | 定位 | README |
| --- | --- | --- |
| `springboot/` | **契约来源**：Spring Boot 4.1 + JDK 17 + MyBatis-Plus + Security + OAuth2 | [README](../springboot/README.md) |
| `fastapi/` | Python：FastAPI + SQLAlchemy + Pydantic | [README](../fastapi/README.md) |
| `express/` | Node.js：Express 4 + mysql2（原名 `nodejs/`） | [README](../express/README.md) |
| `nestjs/` | Node.js：NestJS 10 + TypeORM（模块化 / DI） | [README](../nestjs/README.md) |
| `gin/` | Go：Gin + database/sql | [README](../gin/README.md) |
| `laravel/` | PHP：Laravel 11（Request/Resource 分层） | [README](../laravel/README.md) |
| `thinkphp/` | PHP：ThinkPHP 8（Validate/Model/Service） | [README](../thinkphp/README.md) |
| `vue/` | 前端模板：Vue 3 + Vite + antdv-next + Pinia + i18n（含 SSO 登录与管理后台） | [README](../vue/README.md) |

## 统一约定（7 套后端一致）

- 响应：`{code, success, message, data, timestamp}`，HTTP 恒 200，业务码在 `code`
- 分页：`{pageNum, pageSize, total, pages, records}`，默认 `1/10`，上限 500
- 路径：`/sso/authorize`、`/sso/callback`、`/api/auth/*`、`/api/bff/me`、`/api/users*`、`/api/admin/users*`、`/api/demo/*`
- 权限：未登录 401、非管理员 403、账号被禁用 403
- 用户：`users.uid` = SSO `sub`（用户唯一标识，可能是整数 uid / username / email / phone，一律按字符串存），本地维护 `role` / `status` / `deleted`（回收站）/ `version`
- 建表：每套目录下 `sql/init.sql` 内容一致，可直接 `mysql < sql/init.sql`

## 本地端口

| 模板 | 命令 | 端口 |
| --- | --- | --- |
| `springboot/` | `mvn spring-boot:run` | 8080 |
| `fastapi/` | `uvicorn app.main:app --reload` | 8080 |
| `express/` | `npm run dev` | 8080 |
| `nestjs/` | `npm run start:dev` | 8080 |
| `gin/` | `go run ./cmd/server` | 8080 |
| `laravel/` | `php artisan serve --port=8080` | 8080 |
| `thinkphp/` | `php think run -p 8080` | 8080 |
| `vue/` | `npm run dev` | 3000 |

> 回调地址统一 `http://localhost:8080/sso/callback`，需在 SSO 控制台登记一次即可对全部后端生效。
