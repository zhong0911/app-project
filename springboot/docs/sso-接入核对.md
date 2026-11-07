# SSO（passport-sso）对接核对与子应用接入清单

## 一、结论

本模板（OAuth2 Client + Resource Server + 方案B 本地角色 + BFF + Redis 会话）与 passport-sso **完全对接**。

**方案B 成立的关键**：SSO 的 access_token 中 `sub` 固定为**用户数据库自增 id**（`SsoUser.getId()`），不是用户名。子应用取 `sub` → 查本地 `users.uid` → 注入 `ROLE_*`。

> ⚠️ `sub` 是 SSO 库里用户的真实自增 id。本地造数据的 `uid='1001'/'2000'` 仅作测试；真实环境要把 SSO 用户的实际 id 注册进子应用 `users.uid`。

## 二、逐项核对表

| 项 | SSO 实际行为 | 子应用对应 | 是否匹配 |
|---|---|---|---|
| sub 声明 | `claims.put("sub", String.valueOf(user.getId()))`，用户 id 不可改 | `LocalRoleGrantedAuthoritiesConverter` 取 sub 查本地表 | ✅ |
| token 声明 | 按 scope 发（见下表） | 只用 sub，roles/permissions 未消费（可精简 scope） | ✅ |
| 端点路径 | SAS 标准：`/oauth2/authorize`、`/oauth2/token`、`/oauth2/jwks`、`/oauth2/revoke`、`/oauth2/introspect`、`/userinfo`、`/connect/logout`、`/.well-known/**` | `application.yml` 显式配置的端点一致 | ✅ |
| client 注册 | **动态管理**（`GovernedRegisteredClientRepository` + `SsoClientProfile`），后台「应用接入」新建，可启停（停用后 `findByClientId` 返回 null，换不到新 token） | 在 SSO 后台注册 client + 登记回调 | ✅ |
| consent | `consent_required` 时 SSO 302 到控制台 `/consent`，用户同意后 POST 回 `/oauth2/authorize` 才发 code | 首次接入需在 SSO 登录页同意授权 | ✅ |
| token TTL | access 900s、refresh 2592000s、code 120s | 后端 session 30min，持 refresh 自动续，前端无感 | ✅ |
| 会话 | Redis session（namespace `sso:session`）+ Cookie `sso_session`，`SSO_COOKIE_DOMAIN` 可配父域 | 子应用会话 Cookie `SESSION` 落 Redis（`spring:session`） | ✅ |
| issuer | `sso.issuer = ${SSO_ISSUER}` | 子应用 `.env` 的 `SSO_ISSUER` 同值 | ✅ |

## 三、token 声明与 scope

SSO 按申请的 scope 往 token 里写声明（`applyScopedClaims`）：

| scope | token 返回声明 |
|---|---|
| `profile` | `preferred_username`、`name`、`picture` |
| `email` | `email`、`email_verified` |
| `phone` | `phone_number` |
| `roles` | `roles`（角色代码列表） |
| `permissions` | `permissions` |

> 子应用申请 `openid,profile,email,roles,permissions`。方案B 只用 sub，token 内 roles/permissions 未消费——可保留备用，也可精简 scope 减小 token 体积。

## 四、子应用接入清单（三件事）

1. **SSO 后台注册应用**：新建 OAuth2 应用，拿 `client-id` / `client-secret`，登记回调地址
   `https://{app}.antx.cc/sso/callback`
2. **写入本地用户**：把 SSO 用户 id 写入子应用 `users.uid` 并赋角色（`ADMIN`/`USER`），未注册用户无权限（403）
3. **配置 `.env`**：
   ```properties
   SSO_CLIENT_ID=你的-client-id
   SSO_CLIENT_SECRET=你的-client-secret
   SSO_ISSUER=https://passport.antx.cc
   SSO_LOGIN_SUCCESS_URL=https://{app}.antx.cc   # 兜底落地页：前端透传 redirect_uri 时以它为准
   ```

## 五、登录与 token 流转（服务端会话）

```
前端 {app}.antx.cc → /sso/authorize?redirect_uri=https://{app}.antx.cc/xxx → 后端 → 302 SSO
→ sso.antx.cc 登录/同意 → 回调 {app}.antx.cc/sso/callback
→ 后端换 access+refresh → 存 Redis session → 下 SESSION Cookie
→ 302 回会话里的 redirect_uri（无参数才回退 SSO_LOGIN_SUCCESS_URL，默认 /api/auth/me）
→ 前端回目标页 → /api/bff/me 拿 uid/role/name
```

> 回跳地址校验：站内相对路径直接放行；绝对地址的 origin 必须在 `CORS_ALLOWED_ORIGINS`
> 白名单内（`SSO_LOGIN_SUCCESS_URL` 是绝对地址时其 origin 自动进白名单），否则一律忽略，
> 防止被构造成开放重定向。

- 前端只持 `SESSION` Cookie，token 全程在后端（Redis），前端不可见
- 会话跨实例共享、重启不掉线
