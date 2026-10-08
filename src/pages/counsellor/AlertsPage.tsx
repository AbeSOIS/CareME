import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertPanel } from '../../components/feature/AlertPanel'
import { HandoverBanner } from '../../components/feature/HandoverBanner'
import { Callout, EmptyState, PageHeader, Tabs } from '../../components/ui'
import { useAlerts } from '../../store/alerts'
import { useAuth } from '../../store/auth'

export default function AlertsPage() {
  const { t } = useTranslation()
  const roles = useAuth((s) => s.session?.effectiveRoles ?? [])
  const isOfficer = roles.includes('emergencyOfficer')
  const { queue, loadQueue } = useAlerts()
  const [tab, setTab] = useState('active')

  useEffect(() => {
    void loadQueue().catch(() => undefined)
    // New alerts must appear without a manual refresh.
    const id = setInterval(() => void loadQueue().catch(() => undefined), 10_000)
    return () => clearInterval(id)
  }, [loadQueue])

  const active = queue.filter((a) => a.status !== 'closed')
  const closed = queue.filter((a) => a.status === 'closed')
  const list = tab === 'active' ? active : closed

  return (
    <>
      <PageHeader title={t('alerts.title')} lead={t('alerts.lead')} />
      <HandoverBanner />
      {!isOfficer && !roles.includes('admin') && <Callout tone="info" className="mb-4">{t('alerts.notOnDuty')}</Callout>}
      <Tabs
        label={t('alerts.title')}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'active', label: t('alerts.tabs.active'), badge: active.length ? <span className="rounded-full bg-red-600 px-2 text-xs font-bold text-white">{active.length}</span> : null },
          { id: 'closed', label: t('alerts.tabs.closed') },
        ]}
      >
        {list.length === 0 ? (
          <EmptyState>{t('alerts.none')}</EmptyState>
        ) : (
          <ul className="space-y-3" aria-live="polite">
            {list.map((a) => (
              <AlertPanel key={a.id} alert={a} canAct={isOfficer} />
            ))}
          </ul>
        )}
      </Tabs>
    </>
  )
}
