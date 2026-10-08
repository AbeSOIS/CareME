import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ReferralForm } from '../../components/forms/ReferralForm'
import { Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Select, Spinner, Tabs } from '../../components/ui'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import { referralsApi, type ReferralView } from '../../services/api'
import { useUi } from '../../store/ui'
import type { Referral } from '../../types'

const STATUSES: Referral['status'][] = ['received', 'underReview', 'accepted', 'actioned', 'closed']

export default function ReferralsPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const { districtName, dsName } = useLookups()
  const { data, loading, reload } = useAsync(() => referralsApi.list(), [])
  const [tab, setTab] = useState('inbound')
  const [creating, setCreating] = useState(false)
  const [actionFor, setActionFor] = useState<ReferralView | null>(null)
  const [actionText, setActionText] = useState('')
  const [status, setStatus] = useState<Referral['status']>('underReview')

  const list = (data ?? []).filter((r) => r.direction === tab)

  return (
    <>
      <PageHeader
        title={t('referrals.title')}
        lead={t('referrals.lead')}
        actions={
          <Button icon={<Plus aria-hidden className="size-5" />} onClick={() => setCreating(true)}>
            {t('referrals.new')}
          </Button>
        }
      />
      <Tabs label={t('referrals.title')} active={tab} onChange={setTab} tabs={[{ id: 'inbound', label: t('referrals.inbound') }, { id: 'outbound', label: t('referrals.outbound') }]}>
        {loading ? (
          <Spinner label={t('common.loading')} />
        ) : !list.length ? (
          <EmptyState>{t('common.noResults')}</EmptyState>
        ) : (
          <ul className="space-y-3">
            {list.map((r) => (
              <Card as="li" key={r.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{t(`referrals.statuses.${r.status}`)}</Badge>
                      <Badge tone={r.urgency === 'urgent' ? 'danger' : r.urgency === 'priority' ? 'warning' : 'neutral'}>{t(`referrals.urgencies.${r.urgency}`)}</Badge>
                      {r.source && <Badge tone="brand">{t(`referrals.sources.${r.source}`)}</Badge>}
                      {r.pendingRegistration && <Badge tone="info">{t('portal.pendingRegistration')}</Badge>}
                    </div>
                    <p className="font-semibold">{r.sourceOrganisation ?? r.destination}</p>
                    <p>{r.reason}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {fmt.date(r.referralDate)}
                      {r.receivingDistrictId && ` · ${districtName(r.receivingDistrictId)}`}
                      {r.receivingDsDivisionId && ` / ${dsName(r.receivingDsDivisionId)}`} · {t('referrals.consent')}: {t(`referrals.consents.${r.consentStatus}`)}
                    </p>
                    <p className="text-sm">
                      {r.clientCode ? (
                        <span className="font-mono">
                          {r.clientCode} {r.clientName}
                        </span>
                      ) : (
                        <Badge>{t('referrals.unlinked')}</Badge>
                      )}
                    </p>
                    {r.actions.length > 0 && (
                      <details className="text-sm">
                        <summary className="min-h-9 cursor-pointer font-medium">
                          {t('referrals.actions')} ({r.actions.length})
                        </summary>
                        <ul className="mt-1 list-disc pl-5">
                          {r.actions.map((a, i) => (
                            <li key={i}>
                              {fmt.dateTime(a.at)} — {a.text}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const caseLink = r.caseId ? `/counsellor/cases/${r.caseId}` : null
                      return caseLink ? (
                        <Link to={caseLink} className="inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-brand-800 hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-slate-800">
                          {t('portal.openCase')}
                        </Link>
                      ) : null
                    })()}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setActionFor(r)
                        setStatus(r.status)
                        setActionText('')
                      }}
                    >
                      {t('referrals.updateStatus')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </Tabs>

      <Modal open={creating} onClose={() => setCreating(false)} size="lg" title={t('referrals.new')} description={t('referrals.lead')}>
        <ReferralForm
          onSaved={async () => {
            setCreating(false)
            toast(t('referrals.saved'), 'success')
            await reload()
          }}
        />
      </Modal>

      <Modal
        open={Boolean(actionFor)}
        onClose={() => setActionFor(null)}
        title={t('referrals.updateStatus')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setActionFor(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={async () => {
                try {
                  await referralsApi.update(actionFor!.id, { status, action: actionText || undefined })
                  setActionFor(null)
                  toast(t('common.saved'), 'success')
                  await reload()
                } catch (e) {
                  apiError.show(e)
                }
              }}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label={t('common.status')} value={status} onChange={(e) => setStatus(e.target.value as Referral['status'])} options={STATUSES.map((s) => ({ value: s, label: t(`referrals.statuses.${s}`) }))} />
          <Input label={t('referrals.actionText')} value={actionText} onChange={(e) => setActionText(e.target.value)} />
        </div>
      </Modal>
    </>
  )
}
