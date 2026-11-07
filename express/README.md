# AntX Express 后端模板（Node.js）

对标 `springboot/` 的等价实现：统一响应、分层（controller → service → repository）、用户管理、SSO 接入。

> 本目录原名 `nodejs/`，为避免与 NestJS 混淆改名为 `express/`；框架仍是 Node.js + Express 4。

## 目录结构

```
express/
├── src/
│   ├── app.js                     # 装配中间件 + 路由 + 异常（= 自动配置）
│   ├── server.js                  # 监听端口、优雅退出（= main 启动）
│   ├── config/
│   │   ├── index.js               #   配置（= application.yml）
│   │   └── database.js            #   mysql2 连接池 + 事务封装（= DataSource）
│   ├── routes/                    # 路由定义（= @RequestMapping，只绑 URL 和控制器）
│   │   ├── index.js               #   路由汇总
│   │   ├── sso.routes.js          #   /sso/authorize、/sso/callback
│   │   ├── auth.routes.js         #   /api/auth
│   │   ├── bff.routes.js          #   /api/bff
│   │   ├── user.routes.js         #   /api/users
│   │   ├── admin-user.routes.js   #   /api/admin/users
│   │   └── demo.routes.js         #   /api/demo
│   ├── controllers/               # 控制器（= controller/，薄层）
│   ├── services/                  # 业务层（= service/impl/）
│   │   ├── user.service.js
│   │   └── current-user.service.js
│   ├── repositories/              # 仓储层（= mapper/，只写 SQL）
│   │   └── user.repository.js
│   ├── models/                    # 实体映射（= entity/）
│   │   └── user.model.js
│   ├── dtos/                      # 入参 DTO + 校验（= dto/）
│   │   └── user.dto.js
│   ├── vos/                       # 出参 VO（= vo/）
│   │   └── user.vo.js
│   ├── middlewares/               # 中间件（= Security 过滤器 / AOP）
│   │   ├── auth.middleware.js     #   身份解析、requireLogin、requireAdmin
│   │   └── error.middleware.js    #   全局异常 + asyncHandler + 404
│   └── utils/                     # 公共工具（= common/）
│       ├── result.js              #   Result 五字段 + PageResult
│       ├── result-code.js         #   状态码枚举
│       ├── business-error.js      #   业务异常
│       └── sso.js                 #   授权码登录 / 换 token / revoke
├── sql/init.sql                   # 建表 + 初始管理员
├── package.json                   # 依赖（= pom.xml）
└── .env.example
```

## 启动

```bash
cd express
npm install
cp .env.example .env          # 填 DB_* / SSO_CLIENT_ID / SSO_CLIENT_SECRET
mysql -uroot -p < sql/init.sql
npm run dev                   # 等价 node --env-file-if-exists=.env --watch src/server.js
```

> Node 20+。环境变量由 `--env-file-if-exists` 加载，不需要 dotenv 依赖。

## 与 Spring Boot 的对应关系

| Spring Boot | Node.js（Express） |
| --- | --- |
| `TemplateApplication` | `src/server.js` |
| `@RestController` | `src/controllers/*.controller.js` |
| `@RequestMapping` | `src/routes/*.routes.js` |
| `@Service` | `src/services/*.service.js` |
| `@Mapper` | `src/repositories/*.repository.js` |
| `entity/` | `src/models/*.model.js` |
| `dto/` + `vo/` | `src/dtos/` + `src/vos/` |
| `@RestControllerAdvice` | `middlewares/error.middleware.js` |
| `SecurityConfig` + 拦截器 | `middlewares/auth.middleware.js` |
| `application.yml` | `src/config/index.js` + `.env` |

## 接口一览

统一返回 `{code, success, message, data, timestamp}`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/sso/authorize` | 302 跳 SSO 登录页 |
| GET | `/sso/callback` | 回调：换 token、写会话、注册默认用户、跳成功页 |
| GET | `/api/auth/me` | 当前登录用户 |
| POST | `/api/auth/logout` | 撤销 token + 销毁会话 |
| GET | `/api/bff/me` | 聚合登录态 |
| POST/GET/PUT/DELETE | `/api/users`、`/api/users/:id` | 用户 CRUD + 分页 |
| GET/POST | `/api/admin/users`、`/api/admin/users/recycle` | 管理端列表 / 回收站 |
| PUT | `/api/admin/users/:id/status` | 启用 / 禁用 |
| DELETE | `/api/admin/users/:id`、`/purge` | 软删除 / 彻底删除 |
| POST | `/api/admin/users/:id/restore` | 恢复 |
| GET | `/api/demo/admin`、`/api/demo/user` | 权限示例 |

## SSO 接入

1. SSO 控制台注册应用，拿 client-id / client-secret，登记回调 `http://localhost:8080/sso/callback`
2. `.env` 填 `SSO_CLIENT_ID` / `SSO_CLIENT_SECRET` / `SSO_ISSUER`
3. 本地 `users.uid` = SSO 用户的 id；`SSO_ADMIN_UID=1` 为默认管理员

- 方案B：SSO 只认证，`users.role` 决定子应用权限
- 会话默认存内存（单实例够用）；多实例请换 `connect-redis` 会话存储
- 生产：`SECURITY_BASIC_ENABLED=false`、`SESSION_SECRET` 随机化、Cookie 加 `secure`、CORS 写具体域名
