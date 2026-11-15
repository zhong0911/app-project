# AntX Laravel 后端模板

对标 `springboot/` 的等价实现：Request（DTO）+ Resource（VO）+ Service + Repository 分层，自带统一响应、用户管理、SSO 接入。

## 目录结构

```
laravel/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/          # 控制器（= controller/，薄层）
│   │   │   ├── SsoController.php     #   /sso/authorize、/sso/callback
│   │   │   ├── AuthController.php    #   /api/auth/me、/api/auth/logout
│   │   │   ├── BffController.php     #   /api/bff/me
│   │   │   ├── UserController.php    #   /api/users
│   │   │   ├── AdminUserController.php # /api/admin/users
│   │   │   └── DemoController.php    #   /api/demo
│   │   ├── Middleware/
│   │   │   ├── ResolveIdentity.php   #   身份解析（= Security 过滤器链）
│   │   │   ├── AuthenticateSso.php   #   登录校验（sso.auth）
│   │   │   └── EnsureAdmin.php       #   管理员校验（sso.admin）
│   │   ├── Requests/                 # 入参 DTO + 校验（= dto/ + @Valid）
│   │   └── Resources/                # 出参 VO（= vo/）
│   ├── Models/User.php               # Eloquent 实体（= entity/）
│   ├── Repositories/UserRepository.php # 仓储层（= mapper/）
│   ├── Services/
│   │   ├── UserService.php           #   业务层（= service/impl/）
│   │   └── SsoClient.php             #   OAuth2 客户端 + JWKS 验签 + revoke
│   └── Support/                      # Result / ResultCode / BusinessException / Principal
├── routes/
│   ├── api.php                       # /api/* 路由
│   └── web.php                       # /sso/* 路由（需 Session）
├── bootstrap/app.php                 # 装配路由 / 中间件 / 异常渲染
├── config/                           # sso.php / session.php / database.php / cors.php
├── database/migrations/              # 建表迁移（等价 sql/init.sql）
├── public/index.php                  # Web 入口（只暴露 public 目录）
├── sql/init.sql                      # 手工建表 + 初始管理员
├── composer.json
└── .env.example
```

## 启动

```bash
cd laravel
composer install
cp .env.example .env && php artisan key:generate
mysql -uroot -p < sql/init.sql
php artisan serve --port=8080
```

## 与 Spring Boot 的对应关系

| Spring Boot | Laravel |
| --- | --- |
| `TemplateApplication` | `bootstrap/app.php` + `public/index.php` |
| `@RestController` | `App\Http\Controllers\Api\*` |
| `@Service` | `App\Services\*` |
| `@Mapper` | `App\Repositories\*` |
| `entity/` | `App\Models\*`（Eloquent） |
| `dto/` + `@Valid` | `App\Http\Requests\*`（FormRequest） |
| `vo/` | `App\Http\Resources\*` |
| `@RestControllerAdvice` | `bootstrap/app.php` 的 `withExceptions` |
| `SecurityConfig` + `@PreAuthorize` | 中间件 `ResolveIdentity` / `sso.auth` / `sso.admin` |
| `application.yml` | `config/*.php` + `.env` |

## 接口一览

统一返回 `{code, success, message, data, timestamp}`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/sso/authorize` | 302 跳 SSO 登录页 |
| GET | `/sso/callback` | 回调：换 token、写会话、注册默认用户、跳成功页 |
| GET | `/api/auth/me` | 当前登录用户 |
| POST | `/api/auth/logout` | 撤销 token + 销毁会话 |
| GET | `/api/bff/me` | 聚合登录态 |
| POST/GET/PUT/DELETE | `/api/users`、`/api/users/{id}` | 用户 CRUD + 分页 |
| GET/POST | `/api/admin/users`、`/api/admin/users/recycle` | 管理端列表 / 回收站 |
| PUT | `/api/admin/users/{id}/status` | 启用 / 禁用 |
| DELETE | `/api/admin/users/{id}`、`/purge` | 软删除 / 彻底删除 |
| POST | `/api/admin/users/{id}/restore` | 恢复 |
| GET | `/api/demo/admin`、`/api/demo/user` | 权限示例 |

## SSO 接入

1. SSO 控制台注册应用，拿 client-id / client-secret，登记回调 `http://localhost:8080/sso/callback`
2. `.env` 填 `SSO_CLIENT_ID` / `SSO_CLIENT_SECRET` / `SSO_ISSUER`
3. 本地 `users.uid` = SSO 用户唯一标识（access_token 的 `sub`，可为整数 uid / username / email / phone，一律按字符串存）；`SSO_ADMIN_UID=1` 为默认管理员

- 方案B：SSO 只认证，`users.role` 决定子应用权限
- `SsoClient#verifyToken` 用 JWKS 验签并校验 issuer（JWKS 缓存 10 分钟）
- 生产：`SESSION_DRIVER=redis`、`SESSION_SECURE_COOKIE=true`、`SECURITY_BASIC_ENABLED=false`、CORS 写具体域名
