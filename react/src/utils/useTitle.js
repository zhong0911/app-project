import { useEffect } from 'react'

import { APP_TITLE } from '@/config/app'

/**
 * 同步 document.title
 * 与 vue 模板路由 meta.title 的行为一致：有标题时为「标题 - 应用名」，否则只有应用名。
 *
 * @param {string} [title] 页面标题（一般传 t('nav.xxx')）
 */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} - ${APP_TITLE}` : APP_TITLE
  }, [title])
}

export default usePageTitle
