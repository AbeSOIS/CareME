import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { SelfAssessmentRunner } from '../../components/feature/SelfAssessmentRunner'
import { Badge, Callout, PageHeader } from '../../components/ui'
import { ASSESSMENTS } from '../../config/assessments'
import { useApiError } from '../../hooks/useApiError'
import { beneficiaryApi } from '../../services/api'
import { useAuth } from '../../store/auth'
import type { SelfAssessmentType } from '../../types'
import { NotFoundPage } from './NotFoundPage'

export function SelfAssessmentPage() {
  const { t } = useTranslation()
  const { type } = useParams()
  const registered = useAuth((s) => s.session?.effectiveRoles.includes('beneficiary') ?? false)
  const apiError = useApiError()
  const tool = ASSESSMENTS[type as SelfAssessmentType]
  if (!tool) return <NotFoundPage />

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/self-assessment" className="text-sm font-medium text-brand-800 hover:underline dark:text-brand-200">
        ← {t('assess.title')}
      </Link>
      <PageHeader
        title={t(`assess.${tool.type}`)}
        lead={
          <>
            {t(`assess.${tool.type}Desc`)}{' '}
            <Badge tone="warning" className="ml-1">
              {tool.instrument} · {t('common.sampleContent')}
            </Badge>
          </>
        }
      />
      <Callout tone={registered ? 'info' : 'success'} className="mb-6">
        {registered ? t('assess.savedNotice') : t('assess.anonNotice')}
      </Callout>
      <SelfAssessmentRunner
        key={tool.type}
        tool={tool}
        saved={registered}
        onComplete={
          registered
            ? async (r) => {
                try {
                  await beneficiaryApi.saveSelfAssessment({ tool: tool.type, score: r.score, bandKey: r.band.key })
                } catch (e) {
                  apiError.show(e)
                }
              }
            : undefined
        }
      />
    </div>
  )
}
