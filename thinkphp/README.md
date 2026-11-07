# AntX ThinkPHP 8 后端模板

对标 `springboot/` 的等价实现：Validate（DTO）+ Model（实体）+ Repository + Service + Controller 分层，自带统一响应、用户管理、SSO 接入。

## 目录结构

```
thinkphp/
├── app/
│   ├── controller/               # 控制器（= controller/，薄层）
│   │   ├── Sso.php               #   /sso/authorize、/sso/callback
│   │   ├── Auth.php              #   /api/auth/me、/api/auth/logout
│   │   ├── Bff.php               #   /api/bff/me
│   │   ├── User.php              #   /api/users
│   │   ├── AdminUser.php         #   /api/admin/users
│   │   └── Demo.php              #   /api/demo
│   ├── middleware/               # ResolveIdentity（身份解析）/ Auth / Admin / Cors
│   ├── model/User.php            # 模型（= entity/）
│   ├── repository/UserRepository.php  # 仓储层（= mapper/）
│   ├── service/
│   │   ├── UserService.php       #   业务层（= service/impl/）
│   │   └── SsoClient.php         #   OAuth2 客户端 + JWKS 验签 + revoke
│   ├── support/                  # Result / ResultCode / BusinessException / Principal
│   ├── validate/                 # 入参 DTO + 校验（= dto/ + @Valid）
│   ├── middleware.php            # 全局中间件
│   ├── ExceptionHandle.php       # 全局异常渲染（= @RestControllerAdvice）
│   └── BaseController.php
├── config/                       # app / database / session / sso / middleware
├── route/app.php                 # 路由（= @RequestMapping）
├── public/index.php              # Web 入口（只暴露 public 目录）
├── sql/init.sql                  # 建表 + 初始管理员
├── composer.json
└── .env.example
```

## 启动

```bash
cd thinkphp
composer install
cp .env.example .env
mysql -uroot -p < sql/init.sql
php think run -p 8080    # 或 php -S 0.0.0.0:8080 -t public
```

## 与 Spring Boot 的对应关系

| Spring Boot | ThinkPHP 8 |
| --- | --- |
| `TemplateApplication` | `public/index.php` |
| `@RestController` | `app\controller\*` |
| `@Service` | `app\service\*` |
| `@Mapper` | `app\repository\*` |
| `entity/` | `app\model\*`（think-orm Model） |
| `dto/` + `@Valid` | `app\validate\*`（Validate） |
| `vo/` | `app\service\*::toVO()` / `app\support\Result::page()` |
| `@RestControllerAdvice` | `app\ExceptionHandle` |
| `SecurityConfig` + `@PreAuthorize` | `app\middleware\*` + 路由中间件 `sso.auth`/`sso.admin` |
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
| GET/POST/PUT/DELETE | `/api/users`、`/api/users/{id}` | 用户 CRUD + 分页 |
| GET/POST | `/api/admin/users`、`/api/admin/users/recycle` | 管理端列表 / 回收站 |
| PUT | `/api/admin/users/{id}/status` | 启用 / 禁用 |
| DELETE | `/api/admin/users/{id}`、`/purge` | 软删除 / 彻底删除 |
| POST | `/api/admin/users/{id}/restore` | 恢复 |
| GET | `/api/demo/admin`、`/api/demo/user` | 权限示例 |

## SSO 接入

1. SSO 控制台注册应用，拿 client-id / client-secret，登记回调 `http://localhost:8080/sso/callback`
2. `.env` 填 `SSO_CLIENT_ID` / `SSO_CLIENT_SECRET` / `SSO_ISSUER`
3. 本地 `users.uid` = SSO 用户 id；`SSO_ADMIN_UID=1` 为默认管理员

- 方案B：SSO 只认证，`users.role` 决定子应用权限
- `SsoClient#verifyToken` 用 JWKS 验签并校验 issuer（JWKS 缓存 10 分钟）
- 生产：`SESSION_TYPE=redis`、`SESSION_SECURE_COOKIE=true`、`SECURITY_BASIC_ENABLED=false`、CORS 写具体域名
