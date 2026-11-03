# AntX PHP 后端模板（对标 Spring Boot 模板）

对标 `springboot`（Spring Boot 4）的统一规范，用原生 PHP 实现同一套后端骨架。**无第三方框架依赖**，内置 PHP 服务器即可运行。

## 目录结构

```
php/
├── public/
│   └── index.php          # 入口：前端控制器 + 极简路由 + 全局异常处理
├── src/
│   ├── Result.php           # 统一响应体（对标 Result）
│   ├── PageResult.php       # 分页封装（对标 PageResult）
│   ├── ResultCode.php       # 状态码枚举（code 分段设计）
│   ├── BusinessException.php
│   ├── GlobalExceptionHandler.php  # 全局异常处理器
│   ├── OAuth2.php           # OAuth2 客户端（provider 注册 / 跳转 URL / 换 token）
│   └── UserController.php   # RESTful 用户示例（内存数据）
├── composer.json
├── .env.example         # 环境变量示例（SSO_*，注入进程环境）
└── README.md
```

## 运行

```bash
# 方式一：PHP 内置服务器（推荐，无需依赖）
php -S 0.0.0.0:8080 public/index.php

# 方式二：Composer 脚本
composer serve
```

## RESTful 接口（对标 UserController）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST   | `/api/users` | 创建用户（JSON body） |
| PUT    | `/api/users` | 更新用户（JSON body） |
| DELETE | `/api/users/{id}` | 删除用户 |
| GET    | `/api/users/{id}` | 用户详情 |
| GET    | `/api/users?pageNum=1&pageSize=10` | 分页列表 |

## OAuth2 客户端（规范路径，全后端统一）

对标 `springboot` 的 `spring.security.oauth2.client`（SSO 授权码登录）：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/sso/authorize` | **跳转到授权服务器**（本模板只接 AntX SSO） |
| GET | `/sso/callback` | **接受授权码 code**，换取 token，重定向登录成功页 |

配置通过环境变量注入（对标 `application.yml` 的 `SSO_*`，见 `.env.example`）：

| 变量 | 说明 |
|------|------|
| `SSO_CLIENT_ID` / `SSO_CLIENT_SECRET` | 子应用在 SSO 控制台注册的 client-id / secret |
| `SSO_ISSUER` | 授权服务器地址；端点留空时由它推导标准路径 |
| `SSO_AUTHORIZATION_URI` / `SSO_TOKEN_URI` / `SSO_USERINFO_URI` | 端点非标准时显式指定（可留空） |
| `SSO_SCOPE` | 授权范围（默认 `openid,profile,email,roles,permissions`） |
| `SSO_LOGIN_SUCCESS_URL` | 登录成功后的重定向地址 |

SSO 控制台登记的回调地址（`redirect_uri`）：

```
https://<你的域名>:<端口>/sso/callback
```

## 管理后台用户管理（MySQL users）

- 身份键：`users.uid` = SSO `access_token` 的 `sub`，唯一；默认 `uid=1` 为管理员。
- 管理员判定：`SSO_ADMIN_UID`（默认 `1`）。
- 建表：执行 `sql/init.sql`；数据库连接用 `DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD`。
- 管理接口（仅管理员；未登录 401，非管理员 403）：
  - `GET /api/admin/users`、`POST /api/admin/users`（body `{"uid":"..."}`）
  - `PUT /api/admin/users/{id}/status`（body `{"status":1|0}`）、`DELETE /api/admin/users/{id}`（软删除）
  - `GET /api/admin/users/recycle`、`POST /api/admin/users/{id}/restore`、`DELETE /api/admin/users/{id}/purge`
- BFF 登录态：`GET /api/bff/me` 返回 `uid / role / isAdmin / status`。

## 统一响应体（Result）

五字段，`data` 为 null 时省略（对标 `@JsonInclude(NON_NULL)`）：

```json
{
  "code": 200,
  "success": true,
  "message": "操作成功",
  "data": { "id": 1, "uid": "1", "role": "ADMIN" },
  "timestamp": 1720000000000
}
```

## 分页（PageResult）

```json
{
  "code": 200,
  "success": true,
  "message": "操作成功",
  "data": {
    "pageNum": 1,
    "pageSize": 10,
    "total": 42,
    "pages": 5,
    "records": [ ... ]
  },
  "timestamp": 1720000000000
}
```

## code 分段设计（ResultCode）

- **HTTP 语义段**：`200` 成功、`400` 参数、`401` 未认证、`403` 无权限、`404` 不存在、`405` 方法不支持、`500` 内部错误
- **业务码段（1000+，按模块递增）**：`1000` 业务异常、`1001` 数据冲突、`1002` 数据库错误、`1003` 文件错误

## 错误也统一返回

业务层抛 `BusinessException`，由 `GlobalExceptionHandler` 捕获并转成统一五字段响应，不向前端暴露异常细节：

```php
throw new BusinessException(ResultCode::NOT_FOUND, '用户不存在');
// -> { "code": 404, "success": false, "message": "用户不存在", "timestamp": ... }
```

接入数据库时，把 `UserController` 的内存数组替换为 PDO/ORM 仓储层即可，路由、响应、异常处理骨架无需改动。
