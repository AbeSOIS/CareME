import { useTranslation } from 'react-i18next'
import { Badge, Button, DataTable, PageHeader, Spinner } from '../../components/ui'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import { adminApi } from '../../services/api'
import type { WaitlistRequest } from '../../types'

export default function WaitlistPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const apiError = useApiError()
  const { districtName } = useLookups()
  const { data, loading, setData } = useAsync(() => adminApi.waitlist(), [])
  const set = async (w: WaitlistRequest, status: WaitlistRequest['status']) => {
    try {
      const updated = await adminApi.setWaitlist(w.id, status)
      setData((list) => (list ?? []).map((x) => (x.id === w.id ? updated : x)))
    } catch (e) {
      apiError.show(e)
    }
  }
  return (
    <>
      <PageHeader title={t('admin.waitlistTitle')} lead={t('admin.waitlistLead')} />
      {loading ? (
        <Spinner label={t('common.loading')} />
      ) : (
        <DataTable
          caption={t('admin.waitlistTitle')}
          rows={data ?? []}
          rowKey={(w) => w.id}
          columns={[
            { key: 'when', header: t('common.date'), primary: true, render: (w) => fmt.dateTime(w.createdAt) },
            { key: 'kind', header: t('search.callbackKind'), render: (w) => <Badge tone="brand">{t(`admin.requestKind.${w.kind}`)}</Badge> },
            { key: 'name', header: t('common.name'), render: (w) => w.contactName },
            {
              key: 'phone',
              header: t('search.contactPhone'),
              render: (w) =>
                w.contactPhone ? (
                  <a className="font-semibold text-brand-800 underline dark:text-brand-200" href={`tel:${w.contactPhone}`}>
                    {w.contactPhone}
                  </a>
                ) : (
                  '—'
                ),
            },
            { key: 'district', header: t('auth.district'), render: (w) => (w.districtId ? districtName(w.districtId) : '—') },
            { key: 'lang', header: t('search.language'), render: (w) => t(`lang.${w.language}`) },
            { key: 'status', header: t('common.status'), render: (w) => <Badge tone={w.status === 'open' ? 'warning' : 'neutral'}>{t(`admin.waitlistStatus.${w.status}`)}</Badge> },
            {
              key: 'act',
              header: t('common.actions'),
              render: (w) => (
                <span className="flex flex-wrap justify-end gap-1 md:justify-start">
                  {w.status === 'open' && (
                    <Button size="sm" variant="secondary" onClick={() => set(w, 'contacted')}>
                      {t('admin.markContacted')}
                    </Button>
                  )}
                  {w.status !== 'closed' && (
                    <Button size="sm" variant="ghost" onClick={() => set(w, 'closed')}>
                      {t('admin.markClosed')}
                    </Button>
                  )}
                </span>
              ),
            },
          ]}
        />
      )}
    </>
  )
}
