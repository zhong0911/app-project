<script setup>
// 首页内容：header / footer 与页面宽度由 LandingLayout 提供
import { useRouter } from 'vue-router'
import {
  CodeOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  DeploymentUnitOutlined,
  ApiOutlined,
  SettingOutlined,
  BgColorsOutlined,
  SafetyCertificateOutlined,
  LoginOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  FolderOutlined,
  TeamOutlined,
} from '@antdv-next/icons'
import AppIcon from '@/components/AppIcon.vue'
import { useUserStore } from '@/stores/modules/user'

const router = useRouter()
const userStore = useUserStore()

// 首屏关键指标
const stats = [
  { value: '4', label: '后端实现' },
  { value: 'SSO', label: '单点登录' },
  { value: '2', label: '布局模式' },
  { value: '100%', label: '按需加载' },
]

// 项目能力介绍
const features = [
  {
    icon: DeploymentUnitOutlined,
    title: '四端同构',
    desc: 'Spring Boot / FastAPI / Node.js / PHP 共用同一套 SSO 流程、users 表与接口约定。',
  },
  {
    icon: SafetyCertificateOutlined,
    title: 'SSO 会话',
    desc: '授权码登录，access_token 留在服务端，前端只通过会话 Cookie 维持登录态。',
  },
  {
    icon: TeamOutlined,
    title: '管理后台',
    desc: '用户列表、启停、软删除与回收站恢复，管理员路由守卫开箱可用。',
  },
  {
    icon: BgColorsOutlined,
    title: '主题与国际化',
    desc: '亮/暗主题、语言切换与 AntdvNext 主题 token 已统一接入，移动端断点也已适配。',
  },
]

const introPoints = [
  '前端零配置对接 SSO，不再本地保存 token',
  '内置用户管理与回收站，管理员权限由后端下发',
  '四套后端保持一致的认证与用户接口',
  '主题、语言、响应式布局均已处理',
]

// 技术栈介绍
const techStack = [
  {
    name: 'Vue 3',
    tag: '视图层',
    icon: CodeOutlined,
    desc: '组合式 API + <script setup>，所有页面与组件均为单文件组件。',
  },
  {
    name: 'Vite',
    tag: '构建工具',
    icon: ThunderboltOutlined,
    desc: '开发期按需编译、秒级热更新；生产构建输出到 dist/。',
  },
  {
    name: 'Pinia',
    tag: '状态管理',
    icon: AppstoreOutlined,
    desc: 'stores/modules 下按模块拆分，组合式 store 写法，支持 computed getter。',
  },
  {
    name: 'Vue Router',
    tag: '路由',
    icon: DeploymentUnitOutlined,
    desc: 'history 模式 + 懒加载路由；全局 beforeEach 处理标题与管理员守卫。',
  },
  {
    name: 'Axios',
    tag: '网络请求',
    icon: ApiOutlined,
    desc: 'api/request.js 统一封装 baseURL、鉴权头与五字段响应解包。',
  },
  {
    name: 'AntdvNext',
    tag: 'UI 组件库',
    icon: SettingOutlined,
    desc: '主题 token 驱动亮暗色，全局 ConfigProvider 统一语言与弹层样式。',
  },
  {
    name: 'Tailwind CSS',
    tag: '样式',
    icon: BgColorsOutlined,
    desc: '工具类快速布局，复杂页面配合 scoped CSS 与全局设计令牌。',
  },
  {
    name: 'SSO / OAuth2',
    tag: '认证',
    icon: SafetyCertificateOutlined,
    desc: '后端授权码登录，前端只负责跳转 /sso/authorize，token 全程留在服务端。',
  },
]

// 使用步骤
const steps = [
  { title: '安装依赖', desc: 'Node.js 18+，在 vue 目录执行安装。' },
  { title: '配置环境变量', desc: '按需覆盖 VITE_API_BASE_URL，默认走 vite 代理 /api。' },
  { title: '本地开发', desc: '启动 Vite 开发服务器，默认 http://localhost:5173。' },
  { title: '构建部署', desc: '产出静态文件，交给 Nginx 或后端静态资源目录。' },
]

// 目录说明
const directories = [
  { path: 'src/api', desc: '接口封装与统一 axios 实例' },
  { path: 'src/layouts', desc: 'ConsoleLayout 侧边菜单布局与 LandingLayout 落地页布局' },
  { path: 'src/views', desc: '页面组件（含 admin 用户管理）' },
  { path: 'src/router', desc: '路由表与全局守卫' },
  { path: 'src/stores', desc: 'Pinia 模块（app / user）' },
  { path: 'src/config', desc: '语言、主题等全局配置' },
]

function goLogin() {
  router.push({ path: '/login', query: { redirect_uri: '/' } })
}
</script>

<template>
  <div class="home-content">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-logo"><AppIcon :size="64" /></div>
        <a-tag color="blue" class="hero-badge">Vue 3 + Vite 前端模板</a-tag>
        <h1 class="hero-title">
          开箱即用的
          <span class="gradient-text">现代前端工程</span>
        </h1>
        <p class="hero-desc">
          基于 Vue 3 与 AntdvNext 构建，内置路由、状态管理、请求封装、亮暗主题、
          国际化与 SSO 登录流程。clone 下来即可专注业务开发。
        </p>
        <div class="hero-actions">
          <a-button type="primary" size="large" @click="$router.push('/components')">
            浏览组件
            <ArrowRightOutlined />
          </a-button>
          <a-button size="large" @click="$router.push('/admin/users')" v-if="userStore.isAdmin">
            <SettingOutlined />
            管理后台
          </a-button>
          <a-button v-else size="large" @click="goLogin">
            <LoginOutlined />
            SSO 登录
          </a-button>
        </div>
        <div class="hero-tags">
          <span v-for="item in techStack.slice(0, 5)" :key="item.name">{{ item.name }}</span>
        </div>
        <div class="hero-stats">
          <div v-for="item in stats" :key="item.label" class="hero-stat">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </section>

      <!-- 项目介绍 -->
      <section id="intro" class="section intro-section">
        <div class="intro-grid">
          <div class="intro-copy">
            <a-tag color="blue">项目介绍</a-tag>
            <h2>不是空壳脚手架，<br />而是一套可落地的工程基线</h2>
            <p>
              前端已经把路由、状态管理、请求封装、两套布局、主题、国际化、
              SSO 登录和用户管理串成完整链路；后端四套实现遵循同一套接口约定。
            </p>
            <p>
              不需要的部分可以直接删掉，保留基础设施，把时间花在业务逻辑上。
            </p>
            <ul class="intro-points">
              <li v-for="point in introPoints" :key="point">
                <CheckCircleOutlined />
                <span>{{ point }}</span>
              </li>
            </ul>
          </div>
          <div class="feature-grid">
            <div v-for="item in features" :key="item.title" class="feature-card">
              <span class="feature-icon"><component :is="item.icon" /></span>
              <h3>{{ item.title }}</h3>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 技术栈 -->
      <section id="stack" class="section">
        <div class="section-head">
          <h2>技术栈</h2>
          <p>每一层都保持简单可替换，按业务需要删减。</p>
        </div>
        <div class="stack-grid">
          <div v-for="item in techStack" :key="item.name" class="stack-card">
            <div class="stack-icon"><component :is="item.icon" /></div>
            <div class="stack-body">
              <div class="stack-title">
                <strong>{{ item.name }}</strong>
                <a-tag>{{ item.tag }}</a-tag>
              </div>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 使用指南 -->
      <section id="usage" class="section">
        <div class="section-head">
          <h2>使用指南</h2>
          <p>进入 vue 目录，四步即可跑起来。</p>
        </div>
        <div class="usage-grid">
          <div v-for="(step, index) in steps" :key="step.title" class="step-card">
            <span class="step-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <strong>{{ step.title }}</strong>
            <p>{{ step.desc }}</p>
          </div>
        </div>

        <div class="code-panel">
          <div class="code-head">
            <span>终端</span>
            <span class="code-dots"><i /><i /><i /></span>
          </div>
          <pre><code># 安装依赖
npm install

# 本地开发
npm run dev

# 生产构建
npm run build</code></pre>
        </div>

        <div class="tips-grid">
          <div class="tip-card">
            <CheckCircleOutlined class="tip-icon" />
            <div>
              <strong>环境变量</strong>
              <p>在 <code>vue/.env.local</code> 覆盖 <code>VITE_API_BASE_URL</code>，默认 <code>/api</code> 走 Vite 代理。</p>
            </div>
          </div>
          <div class="tip-card">
            <SafetyCertificateOutlined class="tip-icon" />
            <div>
              <strong>SSO 登录</strong>
              <p>浏览器跳转后端 <code>/sso/authorize</code>，回调 <code>/sso/callback</code>；前端不接触 access_token。</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 目录结构 -->
      <section id="structure" class="section">
        <div class="section-head">
          <h2>目录结构</h2>
          <p>按职责分层，新增业务时不需要重新造轮子。</p>
        </div>
        <div class="dir-grid">
          <div v-for="item in directories" :key="item.path" class="dir-item">
            <FolderOutlined class="dir-icon" />
            <div>
              <code>{{ item.path }}</code>
              <p>{{ item.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 管理后台入口 -->
      <section class="section">
        <div class="admin-callout">
          <div>
            <h3>管理后台</h3>
            <p>
              管理员登录后可在 <code>/admin/users</code> 管理用户、启停账号、软删除与回收站恢复；
              普通用户无法访问。
            </p>
          </div>
          <a-button type="primary" @click="$router.push(userStore.isAdmin ? '/admin/users' : '/login')">
            {{ userStore.isAdmin ? '进入用户管理' : '登录管理员账号' }}
            <ArrowRightOutlined />
          </a-button>
        </div>
      </section>
  </div>
</template>

<style scoped>
/* ---------- hero ---------- */
.hero {
  position: relative;
  padding: 72px 0 56px;
  text-align: center;
  border-radius: 24px;
  background: radial-gradient(60% 75% at 50% 0%, rgba(76, 139, 245, 0.16), transparent 72%);
}

.hero-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.hero-badge {
  margin-bottom: 18px;
}

.hero-title {
  margin: 0;
  font-size: clamp(34px, 5vw, 56px);
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.gradient-text {
  background: linear-gradient(135deg, #4c8bf5, #7b5bf5 55%, #38bdf8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-desc {
  max-width: 640px;
  margin: 20px auto 0;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.8;
}

.hero-actions {
  margin-top: 28px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-tags {
  margin-top: 32px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.hero-tags span {
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(76, 139, 245, 0.1);
}

.hero-stats {
  max-width: 720px;
  margin: 28px auto 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.hero-stat {
  padding: 14px 10px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.66);
}

html.dark .hero-stat {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.hero-stat strong {
  display: block;
  font-size: 22px;
  line-height: 1.2;
  color: #4c8bf5;
}

.hero-stat span {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* ---------- intro ---------- */
.intro-section {
  padding-top: 24px;
}

.intro-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 32px;
  align-items: center;
}

.intro-copy h2 {
  margin: 14px 0 16px;
  font-size: clamp(24px, 3vw, 32px);
  line-height: 1.35;
}

.intro-copy p {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-secondary);
}

.intro-points {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.intro-points li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.intro-points svg {
  flex: none;
  margin-top: 2px;
  color: #4c8bf5;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.feature-card {
  padding: 18px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.66);
}

html.dark .feature-card {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.feature-icon {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #4c8bf5;
  font-size: 18px;
  background: rgba(76, 139, 245, 0.12);
}

.feature-card h3 {
  margin: 12px 0 6px;
  font-size: 15px;
}

.feature-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

/* ---------- sections ---------- */
.section {
  padding: 32px 0;
  scroll-margin-top: 88px;
}

.section-head {
  margin-bottom: 20px;
}

.section-head h2 {
  margin: 0 0 6px;
  font-size: 24px;
}

.section-head p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

/* ---------- tech stack ---------- */
.stack-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stack-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

html.dark .stack-card {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.stack-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(76, 139, 245, 0.12);
}

.stack-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #4c8bf5;
  font-size: 18px;
  background: rgba(76, 139, 245, 0.12);
}

.stack-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.stack-body p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

/* ---------- usage ---------- */
.usage-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.step-card {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.66);
}

html.dark .step-card {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.step-index {
  display: block;
  margin-bottom: 8px;
  font-size: 22px;
  font-weight: 700;
  color: #4c8bf5;
}

.step-card p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.code-panel {
  margin-top: 18px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #0f172a;
  color: #e2e8f0;
}

.code-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  font-size: 12px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.04);
}

.code-dots {
  display: inline-flex;
  gap: 6px;
}

.code-dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #475569;
}

.code-panel pre {
  margin: 0;
  padding: 16px 18px 20px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.8;
}

.tips-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.tip-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(76, 139, 245, 0.08);
}

.tip-icon {
  color: #4c8bf5;
  font-size: 18px;
  margin-top: 2px;
}

.tip-card p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

code {
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
  background: rgba(76, 139, 245, 0.12);
}

/* ---------- directory ---------- */
.dir-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.dir-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.66);
}

html.dark .dir-item {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}

.dir-icon {
  color: #4c8bf5;
  font-size: 18px;
  margin-top: 2px;
}

.dir-item p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ---------- admin callout ---------- */
.admin-callout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 28px;
  border-radius: 16px;
  border: 1px solid rgba(76, 139, 245, 0.2);
  background: linear-gradient(135deg, rgba(76, 139, 245, 0.12), rgba(123, 91, 245, 0.1));
}

.admin-callout h3 {
  margin: 0 0 6px;
  font-size: 18px;
}

.admin-callout p {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

/* ---------- responsive ---------- */
@media (max-width: 1023px) {
  .stack-grid,
  .usage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dir-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .intro-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

@media (max-width: 767px) {
  .hero {
    padding: 48px 0 32px;
  }

  .hero-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .stack-grid,
  .usage-grid,
  .tips-grid,
  .dir-grid {
    grid-template-columns: 1fr;
  }

  .admin-callout {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
