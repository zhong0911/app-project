# AntX NestJS 后端模板

**最贴近 Spring Boot 的一套 Node 模板**：模块化（Module）+ 依赖注入 + 装饰器 + 守卫，几乎和 `@Controller` / `@Service` / `@Module` 一一对应。

## 目录结构

```
nestjs/
├── src/
│   ├── main.ts                          # 入口：会话 / CORS / 校验 / 全局异常 / 监听（= TemplateApplication）
│   ├── app.module.ts                    # 根模块：注册子模块 + 全局守卫（= @ComponentScan）
│   ├── config/
│   │   └── configuration.ts             # 配置（= application.yml）
│   ├── common/                          # 公共能力（= common/ + config/security/）
│   │   ├── filters/global-exception.filter.ts   # 全局异常（= GlobalExceptionHandler）
│   │   ├── guards/identity.guard.ts              # 身份解析（= Security 过滤器链）
│   │   ├── guards/login.guard.ts                 # 登录校验
│   │   ├── guards/admin.guard.ts                 # 管理员校验（= requireAdmin）
│   │   ├── decorators/current-user.decorator.ts  # @CurrentUser()（= Authentication 参数）
│   │   ├── result/result.ts                      # Result 五字段 + PageResult
│   │   ├── result/result-code.ts                 # 状态码枚举
│   │   ├── exceptions/business.exception.ts      # 业务异常
│   │   ├── jwt-verifier.ts                       # JWKS 验签（= 资源服务器）
│   │   └── principal.ts                          # 当前身份模型
│   ├── database/database.module.ts      # TypeORM 数据源（= DataSource 配置）
│   └── modules/                         # 业务模块（一个模块一套 MVC）
│       ├── user/                        #   用户：entity / dto / vo / repository / service / controller
│       ├── sso/                         #   SSO 登录入口 + 客户端（/sso/authorize、/sso/callback）
│       ├── auth/                        #   /api/auth/me、/api/auth/logout
│       ├── bff/                         #   /api/bff/me
│       ├── admin-user/                  #   /api/admin/users
│       └── demo/                        #   /api/demo
├── sql/init.sql                         # 建表 + 初始管理员
├── package.json / tsconfig.json / nest-cli.json
└── .env.example
```

## 启动

```bash
cd nestjs
npm install
cp .env.example .env          # 填 DB_* / SSO_CLIENT_ID / SSO_CLIENT_SECRET
mysql -uroot -p < sql/init.sql
npm run start:dev             # http://localhost:8080
```

## 与 Spring Boot 的对应关系

| Spring Boot | NestJS |
| --- | --- |
| `TemplateApplication` | `main.ts` + `app.module.ts` |
| `@RestController` | `@Controller('api/users')` |
| `@Service` | `@Injectable()` + Module providers |
| `@Mapper` | `UserRepository`（TypeORM Repository） |
| `entity/` | `*.entity.ts`（`@Entity('users')`） |
| `dto/` | `dto/*.dto.ts` + `class-validator`（= `@Valid`） |
| `vo/` | `vo/*.vo.ts`（纯对象映射） |
| `@RestControllerAdvice` | `GlobalExceptionFilter` |
| `SecurityFilterChain` + `@PreAuthorize` | `IdentityGuard` + `LoginGuard` / `AdminGuard` |
| `application.yml` | `config/configuration.ts` + `.env` |

## 接口一览

统一返回 `{code, success, message, data, timestamp}`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/sso/authorize` | 302 跳 SSO 登录页 |
| GET | `/sso/callback` | 回调：换 token、写会话、注册默认用户、跳成功页 |
| GET | `/api/auth/me` | 当前登录用户 |
| POST | `/api/auth/logout` | 撤销 token + 销毁会话 |
| GET | `/api/bff/me` | 聚合登录态（uid / role / isAdmin） |
| POST/GET/PUT/DELETE | `/api/users`、`/api/users/:id` | 用户 CRUD + 分页 |
| GET/POST | `/api/admin/users`、`/api/admin/users/recycle` | 管理端列表 / 回收站 |
| PUT | `/api/admin/users/:id/status` | 启用 / 禁用 |
| DELETE | `/api/admin/users/:id`、`/purge` | 软删除 / 彻底删除 |
| POST | `/api/admin/users/:id/restore` | 恢复 |
| GET | `/api/demo/admin`、`/api/demo/user` | 权限示例 |

## SSO 接入

1. SSO 控制台注册应用，拿 client-id / client-secret，登记回调 `http://localhost:8080/sso/callback`
2. `.env` 填 `SSO_CLIENT_ID` / `SSO_CLIENT_SECRET` / `SSO_ISSUER`
3. 本地 `users.uid` = SSO 用户 id；`SSO_ADMIN_UID=1` 为默认管理员

- 方案B：SSO 只认证，`users.role` 决定子应用权限（`AdminGuard` 用 `SSO_ADMIN_UID` 判定管理员）
- `JwtVerifier` 用 JWKS 校验 Bearer token，校验失败抛 401
- 生产：`DB_SYNC=false`、`SECURITY_BASIC_ENABLED=false`、`SESSION_SECRET` 随机化、Cookie 加 `secure`、CORS 写具体域名
