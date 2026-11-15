# Vue3 AntdvNext 项目模板

一个开箱即用的 Vue 3 前端项目模板，集成了主流的工程化配置与常用库，可作为新业务项目的起点。

## 特性

- 🎨 **全局亮/暗主题**：antdv-next `ConfigProvider` token 驱动，暗色布局透明露出渐变背景，切换持久化并同步 `<html>` 的 `dark` 类
- 🌍 **国际化（i18n）**：`vue-i18n` 管理业务文案，默认支持简体中文 / 繁體中文 / English，AntdvNext 语言包与 dayjs 跟随同一 locale；可按文档说明整体移除
- 🧩 **页面级按需构建**：`unplugin-vue-components` + 官方 resolver 自动导入，首屏 gzip ≈ 253 kB（全量引入约 593 kB）
- 📱 **移动端适配**：`Grid.useBreakpoint()` 断点切换，侧边栏自动变为抽屉菜单
- ⏳ **路由懒加载 + 加载指示**：`router-view v-slot` + `a-spin`，切换页面显示居中 loading
- 💬 **全局弹层 JS 调用**：`message / notification / modal` 任意 JS 中可用，自动继承全局语言与主题
- 🔌 **Axios 封装**：统一拦截器、`401` 只清凭证不跳转、解包响应结构
- 🔐 **SSO 登录（OAuth2 客户端）**：顶栏一键跳转授权服务器，BFF 聚合登录态，会话 Cookie 由后端维护
- 🎯 **Tailwind CSS**：关闭 preflight 避免与 antdv 冲突，`dark:` 变体跟随全局主题

## 技术栈

| 类别      | 库                                          | 版本   |
|-----------|---------------------------------------------|--------|
| 前端框架  | Vue 3（Composition API / `<script setup>`） | ^3.5   |
| 构建工具  | Vite                                        | ^5.4   |
| 路由      | Vue Router                                  | ^4.5   |
| 状态管理  | Pinia                                       | ^2.2   |
| 网络请求  | Axios                                       | ^1.7   |
| UI 组件库 | antdv-next                                  | ^1.5.6 |
| 图标库    | @antdv-next/icons                           | ^1.1.2 |
| 国际化    | vue-i18n                                    | ^11.1  |
| 样式      | Tailwind CSS                                | ^3.4   |
| 日期      | dayjs（跟随全局 locale）                   | ^1.11  |

## 目录结构

```
vue3-antdv-template/
├── .env.development            # 开发环境变量
├── .env.production             # 生产环境变量
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js           # Tailwind/autoprefixer
├── tailwind.config.js          # Tailwind 配置（已关闭 preflight）
├── vite.config.js              # Vite 配置（别名、代理、分包）
└── src/
    ├── main.js                 # 应用入口（Pinia / Router / AntdvNext 按需自动导入）
    ├── App.vue                 # 根组件（a-config-provider + a-app，全局主题/语言）
    ├── api/
    │   ├── request.js           # Axios 封装（拦截器）
    │   └── user.js              # 用户相关接口
    ├── assets/
    │   └── styles/             # 全局样式（含 Tailwind 指令、亮暗渐变背景、滚动条）
    │       └── index.css
    ├── config/
    │   ├── locale.js           # 全局 locale 配置中心（语言列表、antdv 语言包、切换）
    │   └── theme.js            # 全局主题配置（亮/暗 token、组件级覆盖）
    ├── locales/                # i18n 文案（zh-CN / zh-TW / en-US）与 vue-i18n 实例
    ├── layouts/
    │   ├── ConsoleLayout.vue   # 控制台布局（桌面固定侧边栏 / 移动端抽屉菜单 + 顶栏，供 /admin 与示例页）
    │   ├── LandingLayout.vue   # 落地页布局（品牌 header + 语言/主题/登录 + footer，供首页使用）
    │   └── SideMenu.vue        # 侧边菜单内容（logo + 菜单），Sider 与移动端 Drawer 复用
    ├── router/
    │   └── index.js            # 路由配置（含标题守卫）
    ├── stores/
    │   └── modules/            # 按业务划分的 store
    │       ├── app.js          # 侧边栏折叠、暗色主题
    │       └── user.js
    ├── utils/
    │   └── app.js              # 全局 message/notification/modal（含 context）+ toggleTheme
    └── views/
        ├── Home.vue            # 首页
        ├── Components.vue      # 组件预览（antdv 常用组件一览）
        ├── About.vue
        └── NotFound.vue        # 404 页
```

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（默认 http://localhost:3000）
npm run dev

# 生产构建
npm run build

# 本地预览构建产物
npm run preview
```

## 核心功能说明

### 1. 网络请求封装（`src/api/request.js`）

- 统一 `baseURL`：开发环境走 Vite 代理（`/api`），生产环境读取 `VITE_API_BASE_URL`。
- `withCredentials: true`：登录态由后端 SSO 会话 Cookie 维护，前端不保存 token。
- 响应拦截器：自动解包 `{ code, data, message }` 结构；`401` 提示会话过期（不跳转，由业务层处理）。

```js
import request from '@/api/request'

// GET
const {data} = await request.get('/bff/me')

// POST（JSON）
const {data} = await request.post('/auth/logout')
```

### 2. 状态管理（Pinia）

采用组合式（setup）写法，示例见 `src/stores/modules/user.js`。

```js
import {useUserStore} from '@/stores/modules/user'

const userStore = useUserStore()
await userStore.fetchLoginUser()   // 拉取 /api/bff/me 登录态
userStore.loginWithSso('/admin')   // 整页跳转 SSO 授权
```

### 2.1 SSO 登录（OAuth2 客户端，全后端统一规范路径）

前端作为 OAuth2 客户端的入口层，token 全程在后端（会话 Cookie），前端不接触 token：

```
点「SSO 登录」→ 整页跳转 /sso/authorize?redirect_uri=站内相对路径（dev 由 vite 代理到后端）
→ 后端 302 到授权服务器登录页 → 授权后回调后端 /sso/callback
→ 后端换 token、建会话 → 302 回前端 redirect_uri 指定的页面（无参数才落到 SSO_LOGIN_SUCCESS_URL）
→ 前端 onMounted 调 /api/bff/me 拉取登录态（uid / role / name）
```

- 登录入口：`userStore.loginWithSso()`（`LandingLayout.vue` / `ConsoleLayout.vue` 顶栏，未登录时显示）。
- 登录态拉取：`userStore.fetchLoginUser()`（BFF 聚合接口 `GET /api/bff/me`，未登录 401 静默忽略）。
- 回跳地址：`loginWithSso(redirectUri)` 把**站内相对路径**（如 `/admin/users`）透传给后端（后端存会话、回调成功后直接跳过去，不再落到后端的 `/api/auth/me`）；同时存 `localStorage`（`utils/auth.js`，30 分钟过期，一个地址只消费一次）作为兜底，跨标签页/跨页面都能带上；旧版写在 `sessionStorage` 的值会自动迁移。
- 后端校验回跳地址：站内相对路径直接放行（浏览器按前端当前源解析 302，同域部署和 vite 代理都准确）；传绝对地址（跨域部署）时，其 origin 需命中后端 `CORS_ALLOWED_ORIGINS` 或与请求源 / `APP_URL` 同源，用于防止开放重定向。
- 多标签页同步：登录/退出通过 `localStorage` 广播（key `antx_auth_event`），其他标签页收到 `storage` 事件后自动拉取或清空登录态。
- 401 统一处理：接口层派发 `auth:unauthorized`，`router` 集中清状态并跳 `/login?redirect_uri=当前地址`；探测型接口（`/bff/me`、`/auth/logout`）置 `skipAuthRedirect` 不跳转，避免循环。
- dev 代理：`vite.config.js` 已把 `/sso` 与 `/api` 一并代理到后端。
- 生产部署：前端与后端同域（或反向代理 `/sso`、`/api` 到后端）；前后端不同域时，前端域名要写进后端 `CORS_ALLOWED_ORIGINS`，`SSO_LOGIN_SUCCESS_URL` 仅作为兜底落地页。
- provider 默认为 `sso`，对应后端 `application.yml` 的 `spring.security.oauth2.client.registration.sso`。

### 2.2 管理后台（`/admin`，仅管理员）

- `/admin/users`：用户管理（列表 / 按 SSO uid 添加 / 启停 / 软删除）——`a-listy` 虚拟列表（每行单行布局），加载态骨架屏、空态 `a-empty`、分页靠右
- `/admin/recycle`：回收站（恢复 / 彻底删除）——同样的 `a-listy` + 骨架屏 + `a-empty` 规范
- 管理员由后端按 `SSO_ADMIN_UID` 判定（默认 uid=1），通过 `/api/bff/me` 的 `isAdmin` 下发；路由守卫会自动拦截非管理员。
- 接口封装见 `src/api/admin.js`，页面见 `src/views/admin/`。

### 2.3 接口层约定（`src/api/request.js`）

| 能力 | 说明 |
| --- | --- |
| 统一解包 | 后端 `{code, success, message, data, timestamp}`，成功码 `200/0`，返回整个 `res` 供页面取 `data` |
| 错误分级 | 400 参数 / 403 权限 / 404 不存在 / 429 频率 / 5xx 服务 / 超时 / 网络断开各有文案，后端 `message` 优先 |
| 请求取消 | 传 `key` 即启用：同 key 新请求取消上一个（`cancelRequest(key)` / `cancelAllRequests()`） |
| 静默开关 | `skipErrorToast`（不弹提示）、`skipAuthRedirect`（401 不跳登录页） |

### 3. 路由（Vue Router）

- 默认使用 `createWebHistory`（history 模式）。
- 已配置全局前置守卫，自动根据 `meta.title` 设置页面标题。
- 已包含 404 兜底路由。

### 4. 全局 message / notification / modal（`src/utils/app.js`）

antdv-next 的**静态方法**无法直接消费 `<a-config-provider>` 提供的 context（语言、暗色主题等），直接
`import { message } from 'antdv-next'` 时弹层样式不会跟随主题。模板使用官方 `ConfigProvider.config()` 全局配置解决：

- `src/utils/app.js` 调用 `ConfigProvider.config()` 提供全局 `holderRender`：静态弹层渲染时
  会先经过 `ConfigProvider(语言/主题) + <a-app>` 包裹，从而继承全局配置。
- `main.js` 调用 `setupAppContext()` 完成初始化；语言 / 主题变化时 `refreshAppContext()` 自动刷新。
- 之后在**任意 JS**（axios 拦截器、普通函数、工具文件）中：

```js
import { message, notification, modal } from '@/utils/app'

message.success('成功提示')
notification.open({ message: '标题', description: '内容' })
modal.confirm({ title: '确认', onOk: () => {} })
```

这些调用会自动继承全局语言与明暗主题。

- **弹层顶部偏移**：`applyGlobalConfig()` 里同时调用 `message.config({ top: 72 })` 与
  `notification.config({ top: 72 })`。两套布局的顶栏都是 64px（落地页还是 `position: sticky`），
  组件库默认 `top: 8px` 会让 toast 正好压在顶栏上，看起来像「弹层只能在 header 那里显示」；
  如果你的项目顶栏高度不同，只需要改 `src/utils/app.js` 里的 `POPUP_TOP` 一个常量。

### 5. 主题全局配置（`src/App.vue` + `src/config/theme.js`）

```vue
<a-config-provider :locale="antdLocale" :theme="themeConfig">
  <a-app>
    <router-view />
  </a-app>
</a-config-provider>
```

- **单一 `a-config-provider`**：同时传入全局 locale（`antdLocale`，来自 `src/config/locale.js`）与主题配置
  （`themeConfig`，来自 `src/config/theme.js`）。
- **主题 token**：亮色主色 `#4c8bf5`、纯色容器背景（`#ffffff`）、布局底色 `#f0f5fc`、文字 `#1e2a3a`；暗色
  **布局透明**（露出 `html::before` 全局渐变背景：亮 `#e8edf7→#f0f4fc`、暗 `#12141b→#1a1c28`）、卡片容器 `#1a1c26`、弹层 `#161822`、侧边栏 `#12141b`、顶栏 `#22242f`，抽屉背景与侧边栏一致。整体为直角、无阴影风格，全局背景为渐变。
- **暗色切换**：`appStore.isDark` 控制 `theme.darkAlgorithm` / `theme.defaultAlgorithm`，顶栏右上角有切换按钮；状态持久化到
  localStorage + Cookie（key: `theme-mode`，365 天），并同步 `<html>` 的 `dark` 类（供自定义 CSS 与背景过渡使用）。
- **多语言（全局 locale 配置中心）**：顶栏语言下拉支持 简体中文 / 繁體中文 / English。
  语言状态、antdv 语言包、切换逻辑统一由 `src/config/locale.js` 管理：`<a-config-provider :locale>` 使
  组件文案（分页、日期、弹窗按钮等）实时跟随，`vue-i18n` 使业务文案同步切换；选择持久化到
  localStorage + Cookie（key: `app-locale`），并同步 dayjs 与 `<html lang>`。
- **a-app**：为组件内 `App.useApp()` 提供 context；全局静态弹层由 `ConfigProvider.config()` 提供 context。

### 5.1 全局 locale 配置中心（`src/config/locale.js`）

- `LOCALES`：支持的语言列表（key / label / dayjs 名 / antdv 语言包），默认仅 `zh-CN`、`zh-TW`、`en-US`。
- `antdLocale`：当前 antdv-next 语言包（computed，传给 `<a-config-provider :locale>`）。
- `localeKey` / `currentLocale`：当前语言 key 与配置项（响应式）。
- `setLocale(key)`：切换语言 + 持久化 + 同步 vue-i18n、dayjs、`<html lang>`。

### 5.2 国际化（i18n）

业务文案放在 `src/locales/`，按命名空间组织（`common` / `nav` / `landing` / `login` / `home` / `adminUsers` / `adminRecycle` / `components` …）：

```
src/locales/
├── index.js     # createI18n({ legacy: false, globalInjection: true }) + setI18nLocale
├── zh-CN.js     # 简体中文（默认 / fallback）
├── zh-TW.js     # 繁體中文
└── en-US.js     # English
```

组件中使用：

```vue
<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <a-button>{{ t('common.login') }}</a-button>
  <span>{{ t('common.total', { total: 12 }) }}</span>
</template>
```

- 语言下拉由 `src/config/locale.js` 的 `LOCALES` 驱动，`setLocale()` 会同时更新 vue-i18n 与 AntdvNext 语言包。
- 新增语言：在 `src/locales/` 新增语言文件 → 在 `src/locales/index.js` 的 `messages` 注册 → 在
  `src/config/locale.js` 的 `LOCALES` 增加一项（引入对应 `antdv-next/locale/*` 与 dayjs locale）。
- 文案 key 建议按页面/模块划分命名空间，避免跨模块重名。
- **文案里的特殊字符**：vue-i18n 会把 `@` 解析成 linked message、把 `<...>` 当 HTML 提示，因此
  `@antdv-next/icons` 这类值要写成字面量插值 `{'@'}antdv-next/icons`（否则「关于」页会整页白屏），
  含尖括号的说明文字建议改成纯文本（如 `script setup`）。

#### 移除 i18n（项目不需要多语言时）

i18n 是可选能力，按以下步骤可整体移除：

1. 卸载依赖：`npm uninstall vue-i18n`。
2. 删除目录 `src/locales/`。
3. 删除 `src/main.js` 中的 `import { i18n } from './locales'` 与 `app.use(i18n)`。
4. 在 `src/config/locale.js` 中：去掉 `setI18nLocale` 的引入与调用，保留单一语言（或仅保留
   AntdvNext 语言包写死，例如 `const antdLocale = zhCN`），其余组件通过 `LOCALES` 切换语言的逻辑一并删除。
5. 各页面组件中删除 `import { useI18n } from 'vue-i18n'`、`const { t } = useI18n()`，把 `t('xxx')`
   替换为固定文案（可直接从 `src/locales/zh-CN.js` 复制对应中文）。
6. 顶栏语言下拉（`LandingLayout.vue` / `ConsoleLayout.vue`）与 `GlobalOutlined` 一并移除，`<a-config-provider :locale="antdLocale">` 保留固定语言包即可。

### 6. 移动端适配（响应式）

- 布局使用 antdv-next 的 `Grid.useBreakpoint()`（断点 <768px 视为移动端，首帧默认桌面避免闪烁）。
- **移动端**：固定侧边栏切换为左侧 `Drawer` 抽屉菜单（顶栏菜单按钮打开，选中菜单自动关闭）；顶栏语言文字、用户名隐藏只留图标。
- **桌面端**：保留 fixed 侧边栏（可折叠），与之前一致。
- 内容区边距收窄（margin/padding 8~12px）；表单 `label-col` 移动端 24（标签在上）、桌面端 4/16（标签在左）；表格横向滚动（`scroll.x`）；固定宽度组件（日期、滑块、进度条）改为 `width:100%; max-width` 自适应。

### 7. Tailwind CSS

- 配置见 `tailwind.config.js` 与 `postcss.config.js`，已在 `src/assets/styles/index.css`
  引入 `@tailwind base/components/utilities`。
- **已关闭 preflight**（`corePlugins.preflight: false`），避免与 antdv-next 的 reset.css 冲突。
- **`darkMode: 'class'`**：`dark:` 变体跟随 `<html>` 的 `dark` 类，与项目主题切换方案一致。
- 直接在模板中使用工具类：

```html

<div class="flex items-center gap-2 px-4 py-2 rounded bg-blue-500 text-white">
    Tailwind 样式
</div>
```

### 8. AntdvNext 引入方式

当前模板采用 **页面级按需自动导入**：`vite.config.js` 通过 `unplugin-vue-components` +
官方 `@antdv-next/auto-import-resolver`，模板中出现的 `a-xxx` 组件会在编译期自动
`import`，无需全局注册、无需在页面手动引入（`src/main.js` 不再有 `app.use(AntdNext)`）。

```js
// vite.config.js
import { AntdvNextResolver } from '@antdv-next/auto-import-resolver'
import Components from 'unplugin-vue-components/vite'

plugins: [
  vue(),
  Components({
    resolvers: [AntdvNextResolver()],
    dts: false, // JS 项目无需生成的类型声明
  }),
]
```

- 依赖（devDependencies）：`@antdv-next/auto-import-resolver`、`unplugin-vue-components`。
- **JS 中的静态方法**（`message` / `notification` / `modal` / `theme`）不走模板解析，
  继续在 `src/utils/app.js`、`src/config/theme.js` 中具名 `import`（同样可被 tree-shake）。
- **图标**：保持按需 `import { GlobalOutlined } from '@antdv-next/icons'`。
- **体积**：相比全量引入（antdv chunk ≈ 2.19 MB / gzip 593 kB），页面级按需后首屏
  ≈ 0.8 MB（gzip ≈ 253 kB），组件预览页等独有组件随各自路由懒加载。

### 9. 环境变量

项目根目录提供 `.env.example`（模板说明文件）、`.env.development` / `.env.production`（按环境配置）。
本地私有配置写 `.env`（已被 gitignore 忽略，勿提交），修改后重启 dev / 重新 build 生效：

```bash
# .env.development
VITE_APP_TITLE=Vue3 AntdvNext Template
VITE_API_BASE_URL=http://localhost:8080
```

| 变量                | 说明                              |
|---------------------|-----------------------------------|
| `VITE_APP_TITLE`    | 应用标题（用于浏览器标题与 Logo） |
| `VITE_API_BASE_URL` | 后端接口基础地址                  |

开发环境代理在 `vite.config.js` 的 `server.proxy` 中配置，`/api` 与 `/sso` 都指向 `VITE_PROXY_TARGET`（默认 `http://localhost:8080`）。
> 注意 `VITE_API_BASE_URL` 要带后端统一前缀 `/api`（生产填 `https://api.example.com/api`），否则会请求到缺失前缀的路径。

## 环境要求

- Node.js ≥ 18
- npm / yarn / pnpm 任一包管理器

## License

MIT
