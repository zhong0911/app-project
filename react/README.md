# React 前端模板

与仓库里 `vue/` 模板**能力一一对齐**的 React 版本：同样的图床 + 管理后台形态、同样的 SSO 会话认证方式、同样的主题 / 语言 / 组件库配置，只把框架层换成 React 生态。

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

语言包（`src/locales/zh-CN.js` / `zh-TW.js` / `en-US.js`）直接从 vue 模板复用，文案 key 完全相同。

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
    │   ├── admin.js            # 用户管理、角色字典、回收站
    │   └── image.js            # 图床列表、上传、删除、恢复、彻底删除
    ├── assets/styles/
    │   ├── index.css           # Tailwind + 设计令牌 + 滚动条（含 100svh 视口处理）
    │   └── components.css      # 布局与页面结构样式
    ├── components/
    │   ├── AppIcon.jsx         # 应用图标（内联 SVG，可换成图片）
    │   ├── PageLoading.jsx     # 居中加载占位
    │   └── RequireAdmin.jsx    # 管理员路由守卫
    ├── config/
    │   ├── app.js              # 应用标题、账号中心地址
    │   ├── locale.js           # 语言配置中心（antd 语言包 + dayjs + i18next 联动）
    │   └── theme.js            # 亮/暗主题 token
    ├── layouts/
    │   ├── ConsoleLayout.jsx   # 后台布局：固定侧栏 + 顶栏 + 内容区（移动端转抽屉）
    │   └── SideMenu.jsx        # logo + 菜单（桌面 Sider 与移动 Drawer 复用）
    ├── locales/
    │   ├── index.js            # i18next 初始化
    │   ├── zh-CN.js / zh-TW.js / en-US.js
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
        ├── Login.jsx           # SSO 登录入口
        ├── Logout.jsx          # 退出确认（含 SSO 全局退出跳转）
        ├── NotFound.jsx        # 404
        ├── ImageBed.jsx        # 图床：上传 / 粘贴 / 复制 / 回收站
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
| `VITE_APP_TITLE` | 应用标题（`index.html` 的 `<title>` 与侧栏 logo 文案） |
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
- 国际化：`src/locales` 下三套语言包，`config/locale.js` 同时切换 antd 语言包、dayjs 与 i18next。i18next 的插值定界符已配成单花括号（`{total}`），因此 vue 模板的文案可直接复用。
- 新增语言：在 `LOCALES` 加一项（含 antd 语言包与 dayjs locale 名），再补一份语言文件。

## 可裁剪的能力

模板里不是每个项目都需要全部能力，以下都可以整块删掉：

| 要删的能力 | 删除步骤 |
| --- | --- |
| 管理后台 | 删 `views/admin/`、`components/RequireAdmin.jsx`、`api/admin.js`；`router/index.jsx` 去掉 `/admin` 路由；`ConsoleLayout` 的 `menuItems` 去掉后台项 |
| 图床业务页 | 删 `views/ImageBed.jsx`、`api/image.js`；`router` 把 `/image-bed` 换成自己的业务路由 |
| 国际化 | 删 `src/locales/`、`config/locale.js`；去掉 `main.jsx` 的 i18n 引入与 `App.jsx` 的 `locale` 参数；页面里的 `t('xxx')` 换成固定文案 |
| 主题切换 | 删 `config/theme.js`、`stores/app.js` 的 `isDark`/`toggleDark`、`index.html` 的首屏脚本、顶栏主题按钮；`App.jsx` 只传默认 token |
| Tailwind | 删 `tailwind.config.js`、`postcss.config.js`、`index.css` 里的 `@tailwind` 三行与 `package.json` 相关依赖 |

## 说明

- 已弃用的营销页（`/home`、`/about`、`/components`）在本模板中**不实现页面**，只保留到 `/image-bed` 的 redirect，避免旧链接 404。
- 品牌名显示用 `AntX`（X 大写），包名 / 域名用小写 `antx`。
- 接口统一五字段响应：`{ code, success, message, data, timestamp }`，`code` 为 `200` 或 `0` 都视为成功。
