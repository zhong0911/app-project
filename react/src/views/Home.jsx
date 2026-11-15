import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Tag } from 'antd'
import {
  ApiOutlined,
  AppstoreOutlined,
  ArrowRightOutlined,
  BgColorsOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  DeploymentUnitOutlined,
  FolderOutlined,
  LoginOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  TeamOutlined,
} from '@ant-design/icons'

import AppIcon from '@/components/AppIcon'
import { useIsAdmin } from '@/stores/user'

/**
 * 首页：模板落地页
 *
 * header / footer / 页面宽度由 LandingLayout 提供，这里只负责内容区块。
 * 区块 id（#intro / #stack / #usage / #structure）与 LandingLayout 的锚点导航对应。
 */
export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()

  // 首屏关键指标：value 为数字/短语，label 走 i18n
  const stats = [
    { value: '7', labelKey: 'home.stats.backends' },
    { value: 'SSO', labelKey: 'home.stats.sso' },
    { value: '2', labelKey: 'home.stats.layouts' },
    { value: '100%', labelKey: 'home.stats.lazy' },
  ]

  // 项目能力介绍
  const features = [
    { icon: <DeploymentUnitOutlined />, titleKey: 'home.feature.multiBackendTitle', descKey: 'home.feature.multiBackendDesc' },
    { icon: <SafetyCertificateOutlined />, titleKey: 'home.feature.ssoTitle', descKey: 'home.feature.ssoDesc' },
    { icon: <TeamOutlined />, titleKey: 'home.feature.adminTitle', descKey: 'home.feature.adminDesc' },
    { icon: <BgColorsOutlined />, titleKey: 'home.feature.themeTitle', descKey: 'home.feature.themeDesc' },
  ]

  const introPoints = ['home.intro.point1', 'home.intro.point2', 'home.intro.point3', 'home.intro.point4']

  // 技术栈介绍（key 与 locales 中的 home.tech 对应）
  const techStack = [
    { name: 'React 18', tagKey: 'home.tech.reactTag', icon: <CodeOutlined />, descKey: 'home.tech.reactDesc' },
    { name: 'Vite', tagKey: 'home.tech.viteTag', icon: <ThunderboltOutlined />, descKey: 'home.tech.viteDesc' },
    { name: 'Zustand', tagKey: 'home.tech.zustandTag', icon: <AppstoreOutlined />, descKey: 'home.tech.zustandDesc' },
    { name: 'React Router', tagKey: 'home.tech.routerTag', icon: <DeploymentUnitOutlined />, descKey: 'home.tech.routerDesc' },
    { name: 'Axios', tagKey: 'home.tech.axiosTag', icon: <ApiOutlined />, descKey: 'home.tech.axiosDesc' },
    { name: 'Ant Design 5', tagKey: 'home.tech.antdTag', icon: <SettingOutlined />, descKey: 'home.tech.antdDesc' },
    { name: 'i18next', tagKey: 'home.tech.i18nTag', icon: <BgColorsOutlined />, descKey: 'home.tech.i18nDesc' },
    { name: 'SSO / OAuth2', tagKey: 'home.tech.ssoTag', icon: <SafetyCertificateOutlined />, descKey: 'home.tech.ssoDesc' },
  ]

  // 使用步骤
  const steps = [
    { titleKey: 'home.usage.step1Title', descKey: 'home.usage.step1Desc' },
    { titleKey: 'home.usage.step2Title', descKey: 'home.usage.step2Desc' },
    { titleKey: 'home.usage.step3Title', descKey: 'home.usage.step3Desc' },
    { titleKey: 'home.usage.step4Title', descKey: 'home.usage.step4Desc' },
  ]

  // 目录说明
  const directories = [
    { path: 'src/api', descKey: 'home.dir.api' },
    { path: 'src/layouts', descKey: 'home.dir.layouts' },
    { path: 'src/views', descKey: 'home.dir.views' },
    { path: 'src/router', descKey: 'home.dir.router' },
    { path: 'src/stores', descKey: 'home.dir.stores' },
    { path: 'src/config', descKey: 'home.dir.config' },
  ]

  const goLogin = () => navigate('/login?redirect_uri=%2F')

  return (
    <div className="home-content">
      {/* Hero */}
      <section className="hero">
        <div className="hero-logo">
          <AppIcon size={64} />
        </div>
        <Tag color="blue" className="hero-badge">
          {t('home.badge')}
        </Tag>
        <h1 className="hero-title">
          {t('home.titlePrefix')}
          <span className="gradient-text">{t('home.titleHighlight')}</span>
        </h1>
        <p className="hero-desc">{t('home.desc')}</p>
        <div className="hero-actions">
          <Button type="primary" size="large" onClick={() => navigate('/components')}>
            {t('home.browse')}
            <ArrowRightOutlined />
          </Button>
          {isAdmin ? (
            <Button size="large" onClick={() => navigate('/admin/users')} icon={<SettingOutlined />}>
              {t('home.adminPanel')}
            </Button>
          ) : (
            <Button size="large" onClick={goLogin} icon={<LoginOutlined />}>
              {t('home.ssoLogin')}
            </Button>
          )}
        </div>
        <div className="hero-tags">
          {techStack.slice(0, 5).map((item) => (
            <span key={item.name}>{item.name}</span>
          ))}
        </div>
        <div className="hero-stats">
          {stats.map((item) => (
            <div key={item.labelKey} className="hero-stat">
              <strong>{item.value}</strong>
              <span>{t(item.labelKey)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 项目介绍 */}
      <section id="intro" className="section intro-section">
        <div className="intro-grid">
          <div className="intro-copy">
            <Tag color="blue">{t('home.intro.tag')}</Tag>
            <h2>
              {t('home.intro.titleLine1')}
              <br />
              {t('home.intro.titleLine2')}
            </h2>
            <p>{t('home.intro.p1')}</p>
            <p>{t('home.intro.p2')}</p>
            <ul className="intro-points">
              {introPoints.map((point) => (
                <li key={point}>
                  <CheckCircleOutlined />
                  <span>{t(point)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="feature-grid">
            {features.map((item) => (
              <div key={item.titleKey} className="feature-card">
                <span className="feature-icon">{item.icon}</span>
                <h3>{t(item.titleKey)}</h3>
                <p>{t(item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 技术栈 */}
      <section id="stack" className="section">
        <div className="section-head">
          <h2>{t('home.tech.title')}</h2>
          <p>{t('home.tech.subtitle')}</p>
        </div>
        <div className="stack-grid">
          {techStack.map((item) => (
            <div key={item.name} className="stack-card">
              <div className="stack-icon">{item.icon}</div>
              <div className="stack-body">
                <div className="stack-title">
                  <strong>{item.name}</strong>
                  <Tag>{t(item.tagKey)}</Tag>
                </div>
                <p>{t(item.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 使用指南 */}
      <section id="usage" className="section">
        <div className="section-head">
          <h2>{t('home.usage.title')}</h2>
          <p>{t('home.usage.subtitle')}</p>
        </div>
        <div className="usage-grid">
          {steps.map((step, index) => (
            <div key={step.titleKey} className="step-card">
              <span className="step-index">{String(index + 1).padStart(2, '0')}</span>
              <strong>{t(step.titleKey)}</strong>
              <p>{t(step.descKey)}</p>
            </div>
          ))}
        </div>

        <div className="code-panel">
          <div className="code-head">
            <span>{t('home.usage.terminal')}</span>
            <span className="code-dots">
              <i />
              <i />
              <i />
            </span>
          </div>
          <pre>
            <code>{`# 安装依赖
npm install

# 本地开发
npm run dev

# 生产构建
npm run build`}</code>
          </pre>
        </div>

        <div className="tips-grid">
          <div className="tip-card">
            <CheckCircleOutlined className="tip-icon" />
            <div>
              <strong>{t('home.usage.envTitle')}</strong>
              <p>{t('home.usage.envDesc')}</p>
            </div>
          </div>
          <div className="tip-card">
            <SafetyCertificateOutlined className="tip-icon" />
            <div>
              <strong>{t('home.usage.ssoTitle')}</strong>
              <p>{t('home.usage.ssoDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 目录结构 */}
      <section id="structure" className="section">
        <div className="section-head">
          <h2>{t('home.dir.title')}</h2>
          <p>{t('home.dir.subtitle')}</p>
        </div>
        <div className="dir-grid">
          {directories.map((item) => (
            <div key={item.path} className="dir-item">
              <FolderOutlined className="dir-icon" />
              <div>
                <code>{item.path}</code>
                <p>{t(item.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 管理后台入口 */}
      <section className="section">
        <div className="admin-callout">
          <div>
            <h3>{t('home.adminCallout.title')}</h3>
            <p>{t('home.adminCallout.desc')}</p>
          </div>
          <Button type="primary" onClick={() => navigate(isAdmin ? '/admin/users' : '/login')}>
            {isAdmin ? t('home.adminCallout.enter') : t('home.adminCallout.login')}
            <ArrowRightOutlined />
          </Button>
        </div>
      </section>
    </div>
  )
}
