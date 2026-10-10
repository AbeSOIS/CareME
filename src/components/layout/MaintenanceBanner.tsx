import { Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../../store/settings'

/** FR-086: service notice during planned maintenance, with 119 always shown. */
export function MaintenanceBanner() {
  const { t } = useTranslation()
  const notice = useSettings((s) => s.settings.maintenanceNotice)
  if (!notice) return null
  return (
    <div role="status" className="bg-amber-100 text-amber-950 dark:bg-amber-900 dark:text-amber-50">
      <div className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2 text-body-sm">
        <Wrench aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>{t('common.maintenance')}:</strong> {notice} {t('common.emergencyAlwaysAvailable')}
        </p>
      </div>
    </div>
  )
}
