import { Activity, CloudSun, Smile, Wind } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge, Callout, PageHeader } from '../../components/ui'
import { ASSESSMENTS, ASSESSMENT_TYPES } from '../../config/assessments'
import { useAuth } from '../../store/auth'

const ICONS = { stress: Activity, anxiety: Wind, depression: CloudSun, wellbeing: Smile }

export function SelfAssessmentIndex() {
  const { t } = useTranslation()
  const registered = useAuth((s) => s.session?.effectiveRoles.includes('beneficiary'))
  return (
    <>
      <PageHeader title={t('assess.title')} lead={t('assess.lead')} />
      <Callout tone={registered ? 'info' : 'success'} className="mb-6">
        {registered ? t('assess.savedNotice') : t('assess.anonNotice')}
      </Callout>
      <ul className="grid gap-4 sm:grid-cols-2">
        {ASSESSMENT_TYPES.map((type) => {
          const Icon = ICONS[type]
          const tool = ASSESSMENTS[type]
          return (
            <li key={type}>
              <Link
                to={`/self-assessment/${type}`}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:border-brand-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <Icon aria-hidden className="size-8 text-brand-700 dark:text-brand-300" />
                <h2 className="mt-3 text-xl font-semibold">{t(`assess.${type}`)}</h2>
                <p className="mt-1 flex-1 text-slate-600 dark:text-slate-300">{t(`assess.${type}Desc`)}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{t('assess.questions', { count: tool.items.length })}</Badge>
                  <Badge>{tool.instrument}</Badge>
                  <Badge tone="warning">{t('common.sampleContent')}</Badge>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
