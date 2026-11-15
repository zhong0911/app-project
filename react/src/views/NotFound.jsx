import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button, Result } from 'antd'

import { usePageTitle } from '@/utils/useTitle'

/** 404 兜底页 */
export default function NotFound() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  usePageTitle('404')

  return (
    <div className="not-found">
      <Result
        status="404"
        title="404"
        subTitle={t('notFound.subtitle')}
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            {t('notFound.back')}
          </Button>
        }
      />
    </div>
  )
}
