# AntX Spring Boot 4 后端项目模板

基于 **Spring Boot 4.1 + JDK 17 + Maven + MyBatis-Plus + MySQL + Redis + Spring Security** 的可直接运行的通用后端工程模板。

## 技术栈

| 组件 | 版本 | 说明 |
|------|------|------|
| Spring Boot | 4.1.0 | 基于 Spring Framework 7 |
| JDK | 17 | 编译目标 17（运行需 JDK 17+） |
| Maven | 3.6+ | 构建工具 |
| MyBatis-Plus | 3.5.17 | `mybatis-plus-spring-boot4-starter` + `mybatis-plus-jsqlparser`（专为 Boot 4 适配） |
| MySQL | 8.x | 数据库 |
| Redis | 任意 | 缓存（spring-boot-starter-data-redis，Lettuce） |
| 邮件 | - | SMTP 发送（spring-boot-starter-mail，纯文本/HTML/附件） |
| Spring Security | 7.2 | 认证/授权（401/403 统一 JSON，httpBasic 仅本地联调） |
| OAuth2 Client | 7.2 | 子应用作为客户端接入 SSO：登录跳转 + callback 回调（授权码 + client-secret） |
| OAuth2 Resource Server | 7.2 | 资源服务器：校验 SSO 签发的 JWT（Bearer token） |
| fastjson2 | 2.0.65 | 业务 JSON 工具 |
| spring-dotenv | 5.1.0 | 启动时自动加载 `.env` 环境变量 |
| Lombok | - | 简化 POJO |

## 目录结构

```
springboot/
├── pom.xml
├── .env.example                  # 环境变量示例（复制为 .env 填写真实值）
├── .env                          # 本地环境变量（已被 gitignore 忽略，不提交）
├── src/main/java/cc/antx/template/
│   ├── TemplateApplication.java     # 启动类（含 @MapperScan）
│   ├── common/                      # 通用基础
│   │   ├── result/                  #   Result（统一响应）/ PageResult（分页）
│   │   ├── enums/                   #   ResultCode（状态码枚举）
│   │   ├── exception/               #   BusinessException / GlobalExceptionHandler
│   │   └── utils/                   #   JsonUtils（fastjson2）
│   ├── config/                      # 配置类
│   │   ├── MybatisPlusConfig.java   #   分页 + 乐观锁插件
│   │   ├── MyMetaObjectHandler.java #   创建/更新时间自动填充
│   │   ├── RedisConfig.java         #   Redis 序列化配置
│   │   ├── RedisSessionConfig.java  #   Spring Session 落 Redis（手动 @EnableRedisHttpSession）
│   │   ├── WebConfig.java           #   CORS 跨域
│   │   └── security/                #   Security/资源服务器（SecurityConfig、Rest*Handler、LocalRoleGrantedAuthoritiesConverter、ResourceServerConfig）
│   ├── controller/                  # 控制器（UserController、AuthController、OAuth2LoginController、SecurityDemoController、BffController）
│   ├── dto/                         # 请求入参模型（UserCreateDTO 等）
│   ├── vo/                          # 响应出参模型（UserVO、BffUserVO）
│   ├── entity/                      # 实体（对应数据库表）
│   ├── mapper/                      # MyBatis-Plus Mapper
│   └── service/impl/                # 业务层
└── src/main/resources/
    ├── application.yml               # 公共配置（DB/Redis 由 .env 注入）
    ├── application-dev.yml           # 开发环境
    ├── application-prod.yml          # 生产环境
    ├── logback-spring.xml            # 日志
    ├── mapper/UserMapper.xml         # SQL 示例
    └── sql/init.sql                  # 建库建表脚本
```

## 快速开始

### 1. 配置 .env

复制 `.env.example` 为 `.env`，填写数据库 / Redis 连接：

```bash
cp .env.example .env
# 编辑 .env，填入 DB_URL / DB_USERNAME / DB_PASSWORD / REDIS_HOST 等
```

> - `.env` 会被 `spring-dotenv` 在启动时自动加载为环境变量。
> - **数据库连接统一为一个 `DB_URL`**（完整 JDBC 串，含主机/端口/库名/参数）。
> - **dev 环境**：`application-dev.yml` 直接明文写死数据库连接，本地开箱即用，无需 .env。
> - **prod 环境**：`application-prod.yml` 通过 `${DB_URL}` / `${DB_USERNAME}` / `${DB_PASSWORD}` 从环境变量读取，密码不入库。

### 2. 初始化数据库

```sql
-- 连接 MySQL 后执行
SOURCE src/main/resources/sql/init.sql;
```

### 3. 启动

```bash
mvn spring-boot:run
# 或打包运行
mvn clean package -DskipTests
java -jar target/springboot-template-1.0.0-SNAPSHOT.jar
```

生产环境：`java -jar app.jar --spring.profiles.active=prod`（连接信息仍从 .env 读取）

### 4. 验证

```bash
# 创建用户（POST + JSON body）
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"uid":"1001"}'

# 分页查询
curl "http://localhost:8080/api/users?pageNum=1&pageSize=10"
```

### 5. 使用 Redis

value 以 JSON 字符串存储（配合 fastjson2 序列化），规避 Jackson 版本兼容问题：

```java
@Resource
private RedisTemplate<String, String> redisTemplate;

// 写入：对象 -> JSON 字符串
String json = JsonUtils.toJsonString(someObject);
redisTemplate.opsForValue().set("user:1", json, Duration.ofMinutes(5));

// 读取：JSON 字符串 -> 对象
String cached = redisTemplate.opsForValue().get("user:1");
SomeObject obj = JsonUtils.parseObject(cached, SomeObject.class);
```

### 6. 发送邮件

先在 `.env` 填好 SMTP（QQ/163/Gmail，`MAIL_PASSWORD` 填**授权码**不是登录密码），再调用 `MailService`：

```java
@Resource
private MailService mailService;

// 纯文本
mailService.sendSimpleMail(dto);            // to / subject / content / isHtml
// HTML（content 为 HTML 源码）
MailSendDTO html = new MailSendDTO();
html.setTo("xxx@qq.com");
html.setSubject("标题");
html.setContent("<h1>你好</h1><p>HTML 内容</p>");
html.setIsHtml(true);
mailService.sendHtmlMail(html);
// 带附件（支持多个）
mailService.sendAttachmentMail(dto, "C:/tmp/a.pdf", "C:/tmp/b.xlsx");
```

> 测试接口：`POST /api/mail/send`（JSON body）。⚠️ 生产必须叠加鉴权/限流，防止邮件接口被滥用。

### 7. 接口访问日志（AOP）

controller 层每个请求自动打印 `HTTP 方法 / URI / 来源IP / 方法签名 / 耗时`，默认开启：
```bash
HTTP GET /api/users | ip=127.0.0.1 | UserController.page | 耗时 12ms
```
开关：`application.yml` 里 `web.log.enabled: true|false`。

### 8. 接入 AntX SSO（passport-sso）：登录跳转 + callback 回调 + Bearer 保护

本模板作为**子应用**，以 **OAuth2 授权码模式**接入 AntX passport-sso（OAuth2 / OIDC 授权服务器），同时具备：

- **客户端登录**：浏览器跳转 SSO 登录页 → SSO 授权 → 回调换 token、建立会话
- **资源服务器**：`/api/**` 校验 SSO 签发的 JWT（`Authorization: Bearer <access_token>`）

#### 第一步：在 SSO 控制台注册子应用

在 SSO 后台创建一个 OAuth 应用，获得 **client-id / client-secret**，并把回调地址（redirect_uri）登记为：

```
http://localhost:8080/oauth2/sso/callback
```

> `{registrationId}` 就是注册名 `sso`，回调路径规范为 `/oauth2/{provider}/callback`（全后端统一）。

#### 第二步：配置 `.env`

```bash
SSO_ISSUER=https://passport.antx.cc      # SSO issuer 地址（默认已指向 passport.antx.cc）
SSO_CLIENT_ID=app                        # SSO 注册的 client-id（先用 app 占位）
SSO_CLIENT_SECRET=xxxx                   # SSO 注册的 client-secret
# 可选（默认已指向 passport.antx.cc 的 SAS 标准端点）
# SSO_AUTHORIZATION_URI=https://passport.antx.cc/oauth2/authorize
# SSO_TOKEN_URI=https://passport.antx.cc/oauth2/token
# SSO_USERINFO_URI=https://passport.antx.cc/userinfo
# SSO_JWKS_URI=https://passport.antx.cc/oauth2/jwks
```

#### 登录跳转 + callback

| 场景 | 地址 | 说明 |
|---|---|---|
| **跳转 SSO 登录页** | 浏览器访问 `http://localhost:8080/oauth2/sso/authorize` | 302 到 SSO `/oauth2/authorize`，带 client_id/scope/redirect_uri/state（见 `controller/OAuth2LoginController.java`） |
| **SSO 授权回调** | `http://localhost:8080/oauth2/sso/callback` | SSO 授权后重定向回来，Spring 用 client-secret 换 token、建会话，跳 `SSO_LOGIN_SUCCESS_URL`（默认 `/api/auth/me`） |
| **获取当前登录用户** | `GET /api/auth/me` | 返回 `type=sso-login` + SSO 用户资料 |

> 服务端 → 前端跳转：前端浏览器直接访问 `http://localhost:8080/oauth2/sso/authorize` 即可。

#### API 场景（Bearer Token）

```bash
curl -H "Authorization: Bearer <access_token>" "http://localhost:8080/api/auth/me"
# → {"code":200,"data":{"type":"sso-jwt","subject":"<uid>","claims":{...}}}
```

- 未认证 / 令牌无效 / SSO 不可达均返回统一 401 JSON（资源服务器懒加载，见 `ResourceServerConfig`）。
- 客户端配置为**显式端点**（非 issuer-uri），SSO 未启动时应用也能正常启动，只有真正登录跳转才需要 SSO。

#### 角色本地化（方案B：子应用自治，SSO 只认证）

**核心原则：SSO 负责认证（token 证明"你是谁"），子应用负责授权（"你能干什么"）。**

子应用的管理员/用户角色不放进 SSO token，由**本地表 `t_user`** 管理。token 取 `sub`（passport-sso 的 **sub 就是用户 uid**）→ 查本地表 → 注入 `ROLE_*`：

```
Bearer access_token（sub=uid）
  → 校验 JWT（issuer-uri 验签）
  → 取 sub(=uid)
  → 查 t_user.uid → 取 role（如 ADMIN / USER）
  → 注入 ROLE_ADMIN / ROLE_USER
  → @PreAuthorize("hasRole('ADMIN')") 控制接口
```

`t_user` 表以 **SSO uid 为身份键**，去掉本地的用户名/昵称/邮箱（资料由 SSO 提供，本地不维护）。字段如下（见 `sql/init.sql`，存量表用注释里的 ALTER）：

| 字段 | 说明 |
|---|---|
| `uid` | SSO 用户 uid（= access_token 的 sub），唯一键，必填 |
| `role` | 子应用角色：`ADMIN`（管理员）/ `USER`（普通用户） |

**角色规则：**

- **未注册即无权限**：本地表查不到该 uid → 无任何子应用角色，访问受保护接口返回 **403 JSON**（子应用自治，注册后再赋角色）。
- **初始管理员 `uid=1`**：初始数据库时 `uid=1` 的用户为 `ADMIN`（`init.sql` 种子数据）。
- **赋/改角色**：给某 uid 插入本地记录并设角色，或调 `PUT /api/users` 更新已有用户角色。

```sql
-- 初始管理员（uid=1，init.sql 已内置）
INSERT INTO t_user (id, uid, role) VALUES (1, '1', 'ADMIN')
ON DUPLICATE KEY UPDATE role = 'ADMIN';

-- 注册/赋角色：把 uid=1001 的用户设为管理员
INSERT INTO t_user (uid, role) VALUES ('1001', 'ADMIN')
ON DUPLICATE KEY UPDATE role = 'ADMIN';
```

> 也可通过 `PUT /api/users`（body `{"id":2,"role":"ADMIN"}`）把某用户升为管理员。

**接口授权用法**（示例见 `controller/SecurityDemoController.java`）：

```java
@GetMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")          // 仅管理员
public Result<String> adminOnly() { ... }

@GetMapping("/user")
@PreAuthorize("hasAnyRole('ADMIN','USER')") // 已登录用户（管理员或普通用户）
public Result<String> anyLoginUser() { ... }
```
- 角色变更**改库即生效**（无需等 token 过期），多子应用角色互不干扰。
- 实现类：`config/security/LocalRoleGrantedAuthoritiesConverter`（token 取 sub 查本地 role 注入 ROLE_*）。

> 曾实现过从 token 的 `realm_access` / `resource_access.{clientId}.roles` / 内嵌 permissions 提取角色（角色放 token），已移除；若日后需要 SSO 平台级权限，可再引入。

#### 本地联调（无 SSO）

保留 httpBasic 内存用户 `admin / admin123`（`.env` 可改），不接 SSO 时也能测通接口：

```bash
curl -u admin:admin123 "http://localhost:8080/api/users?pageNum=1&pageSize=10"
```

> 权限规则见 `config/security/SecurityConfig.java`（放行公开接口、调整角色、`@PreAuthorize` 用法）。

## API 接口一览

所有接口统一返回 `Result` 五字段（`code / success / message / data / timestamp`），入参为 DTO + JSON body。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/auth/me` | 获取当前登录用户（Bearer JWT 解析 / httpBasic） |
| GET | `/api/bff/me` | **BFF 聚合**：SSO 身份 + 子应用角色，前端友好出参（裁剪敏感 claims） |
| GET | `/api/demo/admin` | 角色示例：仅 `ADMIN` 可访问（`@PreAuthorize("hasRole('ADMIN')")`） |
| GET | `/api/demo/user` | 角色示例：已登录用户可访问（`@PreAuthorize("hasAnyRole('ADMIN','USER')")`） |
| POST | `/api/users` | 创建用户 |
| PUT | `/api/users` | 更新用户（如调整角色 `{"id":2,"role":"ADMIN"}`） |
| DELETE | `/api/users/{id}` | 删除用户（逻辑删除） |
| GET | `/api/users/{id}` | 查询用户详情 |
| GET | `/api/users?pageNum=1&pageSize=10` | 分页查询用户（可按 `uid`/`role` 过滤） |
| POST | `/api/mail/send` | 发送纯文本邮件 |
| POST | `/api/mail/send/html` | 发送 HTML 邮件 |

> 除 `/oauth2/**`、`/error`、`/favicon.ico` 外均需认证（Bearer token 或本地 httpBasic）；邮件接口生产还需叠加限流，防止被滥用。

### BFF（Backend For Frontend，前端后端模式）

**BFF 是"为特定前端定制的后端入口层"**：聚合多个下游服务、裁剪字段，让前端一个端点拿全所需数据，同时隐藏 OAuth2/JWT 的原始 claims 等内部细节。

示例 `GET /api/bff/me`（见 `controller/BffController.java` + `vo/BffUserVO.java`）：聚合 **SSO 身份 + 子应用角色**，返回前端友好的登录态：

```json
{ "authType": "sso-jwt", "uid": "1001", "localId": 2, "role": "ADMIN", "name": "antx" }
```

- **为什么需要**：`/api/auth/me` 返回原始 claims/attributes（含敏感内部信息）；BFF 只暴露前端真正要的字段。
- **适用**：多前端（Web / App / 小程序）各自有聚合层；此处给出单模块示例，可在其上加更多下游聚合。

## 可选模块与删除方法

> 模板里的 **Redis / 邮件 / 接口日志 / .env 加载** 均为**可选模块**，不需要时可以完整移除。
> 所有可选依赖在 `pom.xml` 都有注释标注，按下面清单删即可，不影响核心功能。

| 模块 | 删除依赖（pom.xml） | 删除代码 | 删除配置 |
|---|---|---|---|
| **Redis** | `spring-boot-starter-data-redis`、`commons-pool2`、`spring-session-data-redis` | `config/RedisConfig.java`、`config/RedisSessionConfig.java`（删后会话回到内存 HttpSession） | `application.yml` 的 `spring.data.redis` 段；`.env` 的 `REDIS_*` |
| **邮件** | `spring-boot-starter-mail` | `service/MailService.java`、`dto/MailSendDTO.java`、`controller/MailController.java` | `application.yml` 的 `spring.mail` 段；`.env` 的 `MAIL_*` |
| **接口访问日志** | `spring-aop`、`org.aspectj:aspectjweaver`（Spring Boot 4 已移除 aop starter） | `common/aspect/WebLogAspect.java` | `application.yml` 的 `web.log.enabled` |
| **.env 加载** | `me.paulschwarz:spring-dotenv` | - | 改为在系统环境变量/启动参数里传 `DB_URL` 等（`.env` 文件可删） |
| **Security / 资源服务器** | 见下方「完整移除 Security」 | 见下方 | 见下方 |

> 核心骨架（统一响应、全局异常、DTO/VO、MyBatis-Plus、MySQL、validation）不受上述删除影响。

### 完整移除 Spring Security + 资源服务器

> 说明：不是所有子应用都需要接 SSO，多数需要、少数不需要。不需要时按下述移除，接口即回到**免认证**状态，其余功能不受影响。

1. **删依赖**（`pom.xml`）：删除 `spring-boot-starter-security`、`spring-boot-starter-oauth2-client`、`spring-boot-starter-oauth2-resource-server` 三个依赖。
2. **删代码**：删除整个包 `src/main/java/cc/antx/template/config/security/`（`SecurityConfig`、`RestAuthenticationEntryPoint`、`RestAccessDeniedHandler`、`ResourceServerConfig`、`LocalRoleGrantedAuthoritiesConverter`），以及 `controller/AuthController.java`、`controller/OAuth2LoginController.java`、`controller/SecurityDemoController.java`、`controller/BffController.java`、`vo/BffUserVO.java`（BFF 依赖 Security）。
3. **删配置**（`application.yml`）：删除 `spring.security` 段（内存用户 + `oauth2`）与 `.env` / `.env.example` 的 `SECURITY_ADMIN_*`、`SSO_*` 键。
4. **删数据**（可选）：若不再按 SSO 区分角色，可删掉 `t_user` 的 `uid`、`role` 两列与 `uk_uid` 唯一键（见 `sql/init.sql` 注释）。
5. （可选）`common/aspect/WebLogAspect` 等与安全无关的模块不受影响。

> 若只想保留"某些接口公开、其余需认证"，只需改 `SecurityConfig` 的 `.requestMatchers(...).permitAll()` 放行规则，不用删安全。

## 规范约定

### 统一响应（FastJSON 五字段）

所有接口统一返回：

```json
{
  "code": 200,
  "success": true,
  "message": "操作成功",
  "data": {},
  "timestamp": 1720000000000
}
```

- 成功：`Result.success(data)`；失败：`Result.error(...)`
- 状态码定义集中在 `common/enums/ResultCode`，业务错误码从 1000 起按模块递增。

### DTO / VO 分层

- **DTO**（`dto/`）：请求入参，只含前端需提交字段，配合 `@Valid` 参数校验。
- **VO**（`vo/`）：响应出参，隐藏 `deleted/version` 等内部字段。
- **Entity**（`entity/`）：持久化映射，不直接暴露给前端。
- 涉及长文本 / 结构化入参的 POST、PUT 一律使用 **JSON body（`@RequestBody`）**，不用表单。

### 已内置能力

- 全局异常统一处理（业务异常、参数校验、404、方法不支持等）
- 分页插件 + 逻辑删除（`deleted` 字段）+ 乐观锁（`version` 字段）
- `create_time` / `update_time` 自动填充
- Redis 缓存（Lettuce + 连接池 + JSON 序列化）<可选>
- **Spring Session 会话落 Redis**：OAuth2 的 access_token / refresh_token 与 HttpSession 一起存进 Redis，多实例共享、重启不掉线 <可选>
- 邮件发送（纯文本 / HTML / 附件，SMTP 配置走 .env）<可选>
- 接口访问日志（AOP 切面）<可选>
- Spring Security 认证/授权 + OAuth2 资源服务器（Bearer JWT 校验），401/403 统一 JSON <可选>
- `.env` 环境变量管理（数据库、Redis、邮件、端口），敏感信息不入库
- CORS 跨域、环境隔离（dev/prod）、日志滚动输出

## 注意

- 运行需 **JDK 17+**。模板在 JDK 21 上开发，`pom.xml` 声明 `java.version=17` 产出 17 字节码，开发/部署用 17 或 21 均可。
- **MyBatis-Plus 3.5.9+ 模块化拆分**：分页/乐观锁插件需额外依赖 `mybatis-plus-jsqlparser`，`IService/ServiceImpl` 包名已迁移到 `com.baomidou.mybatisplus.spring.service`——本模板已适配。
- **Spring Boot 4 已迁移 Jackson 3**（`tools.jackson` 包），`GenericJackson2JsonRedisSerializer` 会报 `TypeResolverBuilder` 找不到——模板已改用 String 序列化 + fastjson2 规避。
- **Spring Boot 4 已移除 `spring-boot-starter-aop`**——AOP 改用 `spring-aop` + `org.aspectj:aspectjweaver`。
- **Spring Boot 4 重构了自动配置**：把各功能模块拆成独立 jar（如 `spring-boot-data-redis`），**Spring Session 的自动配置已不在其中**——必须手动加 `@EnableRedisHttpSession`（见 `config/RedisSessionConfig.java`），否则会话仍走 Tomcat 内存。引入 `spring-session-data-redis` + 该注解后，OAuth2 会话（含 access_token / refresh_token）才真正落 Redis。
- 示例业务模块（User）用于演示分层写法，实际开发按业务删除或替换。
