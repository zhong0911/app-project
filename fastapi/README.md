# AntX FastAPI 后端模板

对标 `springboot/` 的等价实现：同样的统一响应、分层、用户管理、SSO 接入，只是换成了 **FastAPI + SQLAlchemy**。

## 目录结构

```
fastapi/
├── main.py                     # 入口：装配中间件、注册路由、注册全局异常（= TemplateApplication）
├── app/
│   ├── core/                   # 基础设施（= Spring 的 config/ + security/）
│   │   ├── config.py           #   配置（= application.yml + .env）
│   │   ├── database.py          #   engine / Session / Base / get_db
│   │   ├── exceptions.py        #   BusinessException + 全局异常处理（= GlobalExceptionHandler）
│   │   ├── security.py          #   身份解析、Bearer 校验、管理员判定（= SecurityConfig）
│   │   └── sso.py               #   SSO 授权码登录 / 换 token / revoke（= OAuth2 Client）
│   ├── api/                     # 路由层（= controller/，只做请求转发，不写业务）
│   │   ├── sso.py               #   GET /sso/authorize、GET /sso/callback
│   │   └── v1/                  #   接口版本目录
│   │       ├── auth.py          #   /api/auth/me、/api/auth/logout
│   │       ├── bff.py           #   /api/bff/me
│   │       ├── user.py          #   /api/users
│   │       ├── admin_user.py    #   /api/admin/users
│   │       └── demo.py          #   /api/demo/*
│   ├── schemas/                 # Pydantic 模型（= dto/ + vo/）
│   │   ├── common.py            #   Result 五字段 / PageResult
│   │   └── user.py              #   UserCreateDTO / UserUpdateDTO / UserQueryDTO / UserVO / BffUserVO
│   ├── models/                  # ORM 实体（= entity/）
│   │   └── user.py
│   ├── repository/              # 仓储层（= mapper/，只做数据库 CRUD）
│   │   └── user_repo.py
│   ├── service/                 # 业务层（= service/impl/）
│   │   └── user_service.py
│   └── common/                  # 状态码枚举（= common/enums/ResultCode）
│       └── result_code.py
├── sql/init.sql                 # 建表 + 初始管理员（= src/main/resources/sql/init.sql）
├── requirements.txt              # 依赖（= pom.xml）
└── .env.example                  # 环境变量示例
```

## 启动

```bash
cd fastapi
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # 填入 DB_URL / SSO_CLIENT_ID / SSO_CLIENT_SECRET
mysql -uroot -p < sql/init.sql
uvicorn main:app --reload --port 8080
```

- Swagger：http://localhost:8080/docs
- 健康检查：`GET /health`

## 与 Spring Boot 的对应关系

| Spring Boot | FastAPI |
| --- | --- |
| `TemplateApplication` | `main.py` |
| `controller/` | `app/api/`（`@Controller` ↔ `APIRouter`） |
| `service/impl/` | `app/service/` |
| `mapper/` | `app/repository/` |
| `entity/` | `app/models/` |
| `dto/` + `vo/` | `app/schemas/`（Pydantic 模型） |
| `application.yml` + `.env` | `app/core/config.py` + `.env`（pydantic-settings） |
| `@RestControllerAdvice` | `register_exception_handlers(app)` |
| `SecurityConfig` + `@PreAuthorize` | `Depends(require_login / require_admin)` |
| `Result` / `PageResult` | `schemas/common.py` 的 `ok()` / `fail()` / `PageResult` |

## 接口一览

所有接口统一返回五字段 `{code, success, message, data, timestamp}`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/sso/authorize` | 302 跳 SSO 登录页（带 state）；可带 `?redirect_uri=xxx`（登录后回跳地址，校验后存会话） |
| GET | `/sso/callback` | SSO 回调：校验 state、换 token、写会话，再 302 到会话里的 `redirect_uri`（无参数才回退 `SSO_LOGIN_SUCCESS_URL`） |
| GET | `/api/auth/me` | 当前登录用户（会话 / Bearer / Basic） |
| POST | `/api/auth/logout` | 撤销 refresh_token + 销毁会话 |
| GET | `/api/bff/me` | BFF 聚合登录态（uid / role / isAdmin） |
| POST/GET/PUT/DELETE | `/api/users`、`/api/users/{id}` | 用户 CRUD + 分页 |
| GET/POST | `/api/admin/users`、`/api/admin/users/recycle` | 管理端列表 / 回收站 |
| PUT | `/api/admin/users/{id}/status` | 启用 / 禁用 |
| DELETE | `/api/admin/users/{id}`、`/api/admin/users/{id}/purge` | 软删除 / 彻底删除 |
| POST | `/api/admin/users/{id}/restore` | 从回收站恢复 |
| GET | `/api/demo/admin`、`/api/demo/user` | 权限示例 |

## SSO 接入（与 springboot 完全一致的契约）

1. SSO 控制台注册应用，拿 `client-id` / `client-secret`，登记回调 `http://localhost:8080/sso/callback`
2. `.env` 填 `SSO_CLIENT_ID` / `SSO_CLIENT_SECRET` / `SSO_ISSUER`
3. 把 SSO 用户的 `id` 写入本地 `users.uid` 并赋角色（`SSO_ADMIN_UID=1` 默认管理员）

```
前端 → /sso/authorize?redirect_uri=/xxx → 302 SSO → 登录/同意 → /sso/callback
     → 换 access+refresh token → 写服务端会话 → 302 回 redirect_uri 指定页面（无参数才回退 SSO_LOGIN_SUCCESS_URL）
```

- 方案B：**SSO 只认证，子应用用本地 `users.role` 授权**；token 取 `sub` 查本地表
- `sub` 是 passport-sso 的用户自增 id；本地造 `uid='1001'` 仅测试用
- 未注册的 uid 访问管理接口返回 403；未登录返回 401

> 生产要求：`SECURITY_BASIC_ENABLED=false`、`SESSION_SECRET` 换随机值、会话 Cookie 加 `secure`、`CORS_ALLOWED_ORIGINS` 写具体域名。
