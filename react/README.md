# React 前端模板

一套可直接落地业务的 React 前端基线：内置落地页、示例页、SSO 会话登录、管理后台、亮暗主题与国际化。能力与仓库里 `vue/` 模板一一对齐，只把框架层换成 React 生态；页面结构按模板形态组织（首页是项目介绍落地页，不是业务首页）。

- 前端框架：React 18
- 构建工具：Vite 6
- UI 组件库：Ant Design 5（`antd` + `@ant-design/icons`）
- 路由：React Router 6
- 状态管理：Zustand
- 国际化：i18next + react-i18next
- 样式：Tailwind CSS 3 + 全局 CSS 变量
- 网络请求：Axios（统一封装拦截器）
- 其他：dayjs、js-cookie

## 与 vue 模板的对照

| 能力 | vue 模板 | 本模板（React） |
| --- | --- | --- |
| 视图层 | Vue 3（Composition API + SFC） | React 18（函数组件 + JSX） |
| 构建 | Vite 5 + `@vitejs/plugin-vue` | Vite 6 + `@vitejs/plugin-react` |
| UI 组件库 | AntdvNext | Ant Design 5 |
| 图标 | `@antdv-next/icons` | `@ant-design/icons` |
| 按需引入 | `unplugin-vue-components` + resolver | antd 5 自带的 ESM tree-shaking，无需额外插件 |
| 路由 | vue-router 4 | react-router-dom 6（懒加载 + 嵌套路由） |
| 状态管理 | Pinia | Zustand |
| 国际化 | vue-i18n | i18next + react-i18next |
| 请求封装 | `src/api/request.js` | 同结构，逻辑一致（5 字段响应、401 事件、取消请求） |
| 主题 | antd token（亮/暗） | 同 token 配置（`config/theme.js`） |
| 登录态 | 后端会话 Cookie，前端不存 token | 完全一致 |

语言包（`src/locales/zh-CN.js` / `zh-TW.js` / `en-US.js`）结构与 vue 模板一致，文案 key 相同；文案内容已改为 React 口径（技术栈、目录名、默认端口）。

## 页面结构

| 路径 | 布局 | 说明 |
| --- | --- | --- |
| `/` | `LandingLayout` | 落地页首页：Hero、项目介绍、技术栈、使用指南、目录结构、管理后台入口 |
| `/home` | — | 旧链接兼容，redirect 到 `/` |
| `/about` | `ConsoleLayout` | 示例页：模板使用的技术栈与版本 |
| `/components` | `ConsoleLayout` | 示例页：常用 Ant Design 组件一览（含暗色适配） |
| `/admin/users`、`/admin/recycle` | `ConsoleLayout` + `RequireAdmin` | 管理后台，仅管理员可进 |
| `/login`、`/logout` | 独立全屏 | SSO 登录入口 / 退出确认 |
| `*` | — | 404 |

两套布局：

- `LandingLayout`：吸顶 header + 锚点导航 + 页脚，无侧边菜单；移动端导航收进左侧抽屉（点品牌区打开）。
- `ConsoleLayout`：桌面固定侧栏（220px，可折叠 80px）+ 顶栏 + 内容区；移动端侧栏转抽屉。

## 目录结构

```
react/
├── index.html                  # 挂载点 #root + 首屏防闪主题脚本
├── vite.config.js              # 端口 3001、@ 别名、/api 与 /sso 代理、React 分包
├── tailwind.config.js          # darkMode: 'class'
├── postcss.config.js
├── .env.development            # 开发环境变量
├── .env.production             # 生产环境变量
├── .env.example                # 变量说明模板
├── public/favicon.svg
└── src/
    ├── main.jsx                # 入口：样式引入 + 全局弹层配置 + 渲染
    ├── App.jsx                 # ConfigProvider（主题/语言）+ 401 全局处理 + 路由
    ├── api/
    │   ├── request.js          # axios 实例：baseURL / withCredentials / 取消请求 / 5 字段响应
    │   ├── user.js             # /auth/logout、/bff/me
    │   └── admin.js            # 用户管理、角色字典、回收站
    ├── assets/styles/
    │   ├── index.css           # Tailwind + 设计令牌 + 滚动条（视口高度用 100vh + 100svh）
    │   ├── components.css      # 布局与页面结构样式
    │   └── landing.css         # 落地页与首页样式
    ├── components/
    │   ├── AppIcon.jsx         # 应用图标（内联 SVG，可换成图片）
    │   ├── PageLoading.jsx     # 居中加载占位（默认铺满可见视口）
    │   └── RequireAdmin.jsx    # 管理员路由守卫
    ├── config/
    │   ├── app.js              # 应用标题、账号中心地址
    │   ├── locale.js           # 语言配置中心（antd 语言包 + dayjs + i18next 联动）
    │   └── theme.js            # 亮/暗主题 token
    ├── layouts/
    │   ├── LandingLayout.jsx   # 落地页布局：header + 锚点导航 + 页脚（移动端抽屉）
    │   ├── ConsoleLayout.jsx   # 后台布局：固定侧栏 + 顶栏 + 内容区（移动端转抽屉）
    │   └── SideMenu.jsx        # logo + 菜单（桌面 Sider 与移动 Drawer 复用）
    ├── locales/
    │   ├── index.js            # i18next 初始化
    │   └── zh-CN.js / zh-TW.js / en-US.js
    ├── router/index.jsx        # 路由表（懒加载 + 管理员守卫 + 404）
    ├── stores/
    │   ├── app.js              # 侧栏折叠、暗色主题
    │   └── user.js             # 用户信息、SSO 登录、退出、多标签页同步
    ├── utils/
    │   ├── app.jsx             # 全局 message / modal（继承主题与语言）
    │   ├── auth.js             # 回跳地址持久化 + 登录态跨标签页广播
    │   ├── scroll-lock.js      # 抽屉滚动锁修复
    │   └── useTitle.js         # document.title 同步
    └── views/
        ├── Home.jsx            # 首页落地页
        ├── About.jsx           # 关于（技术栈版本）
        ├── Components.jsx      # 组件预览
        ├── Login.jsx           # SSO 登录入口
        ├── Logout.jsx          # 退出确认（含 SSO 全局退出跳转）
        ├── NotFound.jsx        # 404
        └── admin/
            ├── AdminUsers.jsx  # 用户管理
            └── AdminRecycle.jsx
```

## 快速开始

需要 Node.js 18+。

```bash
cd react
npm install
npm run dev      # http://localhost:3001
npm run build    # 产物输出 dist/
npm run preview  # 预览构建产物
```

> 端口用 3001 是为了和 `vue/` 模板（3000）错开，两个模板可以同时跑。改端口见 `vite.config.js` 的 `server.port`。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `VITE_APP_TITLE` | 应用标题（`index.html` 的 `<title>`、落地页品牌与侧栏 logo 文案），默认 `AntX 模板` |
| `VITE_API_BASE_URL` | 接口基础地址。开发用 `/api`（走 Vite 代理），生产填完整域名 |
| `VITE_PROXY_TARGET` | 开发环境代理目标（真实后端地址，默认 `http://localhost:8080`） |
| `VITE_ACCOUNT_CENTER_URL` | 账号中心地址，用户菜单「账号中心」跳转目标 |

本地覆盖写 `.env.local`（已在 `.gitignore` 里，不会入库）。

## 认证方式（与后端模板一致）

前端**不保存任何 token**：

1. 点「SSO 登录」→ 整页跳转后端 `/sso/authorize?redirect_uri=<绝对地址>`；
2. 后端 302 到授权服务器，用户授权后回调后端 `/sso/callback`，后端用授权码换 token 并**建立服务端会话**（Session 落 Redis）；
3. 后端 302 回前端页面，此后所有请求靠会话 Cookie（`withCredentials: true`）；
4. 前端通过 `/api/bff/me` 拿到当前用户（`uid`、`isAdmin`）；
5. 接口返回 401 时，`api/request.js` 派发 `auth:unauthorized` 事件，`App.jsx` 监听后清本地状态并跳 `/login?redirect_uri=<当前地址>`。

`isAdmin` 由后端判定（本地用户表 uid=1 为初始管理员），前端不做角色推断；管理后台路由由 `RequireAdmin` 守卫。

## 主题与国际化

- 主题：`config/theme.js` 定义亮/暗两套 token，`App.jsx` 传给 `<ConfigProvider theme>`；切暗色时给 `<html>` 加 `dark` 类（Tailwind `darkMode: 'class'`），持久化到 `localStorage` + Cookie 的 `theme-mode`，`index.html` 里有首屏防闪脚本。
- 国际化：`src/locales` 下三套语言包，`config/locale.js` 同时切换 antd 语言包、dayjs 与 i18next。i18next 的插值定界符配成单花括号（`{total}`），与 vue 模板文案保持兼容。
- 新增语言：在 `LOCALES` 加一项（含 antd 语言包与 dayjs locale 名），再补一份语言文件。

## 视口高度与移动端

页面不再用裸 `100vh`，统一写成 `100vh` + `100svh` 双声明：

```css
min-height: 100vh;
min-height: 100svh; /* 移动端用可见视口高度，避免被浏览器地址栏/标签栏遮挡 */
```

涉及 `index.css`（html/body、渐变底）、`components.css`（布局根、侧栏、内容区、登录页、404、加载占位）与 `landing.css`（落地页）。`PageLoading` 不传 `height` 时走 `.page-loading-full`，同样使用这套双声明。

## 可裁剪的能力

模板里不是每个项目都需要全部能力，以下都可以整块删掉：

| 要删的能力 | 删除步骤 |
| --- | --- |
| 示例页 | 删 `views/About.jsx`、`views/Components.jsx`；`router` 去掉 `/about`、`/components`；`landing`/`home` 文案里的对应 key 可一并清理 |
| 落地页首页 | 删 `layouts/LandingLayout.jsx`、`views/Home.jsx`、`assets/styles/landing.css`；`router` 的 `/` 改成自己的首页（可直接用 `ConsoleLayout`） |
| 管理后台 | 删 `views/admin/`、`components/RequireAdmin.jsx`、`api/admin.js`；`router/index.jsx` 去掉 `/admin` 路由；`ConsoleLayout` 的 `menuItems` 去掉后台项 |
| 国际化 | 删 `src/locales/`、`config/locale.js`；去掉 `main.jsx` 的 i18n 引入与 `App.jsx` 的 `locale` 参数；页面里的 `t('xxx')` 换成固定文案 |
| 主题切换 | 删 `config/theme.js`、`stores/app.js` 的 `isDark`/`toggleDark`、`index.html` 的首屏脚本、顶栏主题按钮；`App.jsx` 只传默认 token |
| Tailwind | 删 `tailwind.config.js`、`postcss.config.js`、`index.css` 里的 `@tailwind` 三行与 `package.json` 相关依赖 |

## 说明

- 品牌文案显示 `AntX`（X 大写），包名 / 域名用小写 `antx`。
- 接口统一五字段响应：`{ code, success, message, data, timestamp }`，`code` 为 `200` 或 `0` 都视为成功。
- 本模板只保留与业务无关的基础设施与示例页，不带具体业务模块（图床等业务实现请见独立仓库）。
