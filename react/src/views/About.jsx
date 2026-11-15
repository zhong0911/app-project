import { Descriptions, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

/**
 * 关于页：模板使用的技术栈与版本
 * 内容只读，实际版本以 package.json 为准。
 */
export default function About() {
  const { t } = useTranslation()

  const items = [
    { key: 'framework', label: t('about.framework'), children: t('about.frameworkValue') },
    { key: 'build', label: t('about.build'), children: t('about.buildValue') },
    { key: 'router', label: t('about.router'), children: t('about.routerValue') },
    { key: 'store', label: t('about.store'), children: t('about.storeValue') },
    { key: 'request', label: t('about.request'), children: t('about.requestValue') },
    { key: 'ui', label: t('about.ui'), children: t('about.uiValue') },
    { key: 'icons', label: t('about.icons'), children: t('about.iconsValue') },
  ]

  return (
    <div className="page">
      <Typography.Title level={2}>{t('about.title')}</Typography.Title>
      <Typography.Paragraph>{t('about.desc')}</Typography.Paragraph>
      <Descriptions bordered column={1} style={{ maxWidth: 480 }} items={items} />
    </div>
  )
}
