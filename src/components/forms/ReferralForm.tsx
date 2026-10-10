import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApiError } from '../../hooks/useApiError'
import { useLookups } from '../../hooks/useLookups'
import { referralsApi } from '../../services/api'
import { useAuth } from '../../store/auth'
import type { BeneficiaryMatch, Referral } from '../../types'
import { Badge, Button, Callout, Input, Select, TextArea } from '../ui'

const SOURCES: NonNullable<Referral['source']>[] = ['hospital', 'prison', 'gramaNiladhari', 'dsFieldOfficer', 'self', 'other']

/**
 * External referral intake (FR-073). Captures only the pre-bid fields, then runs a
 * duplicate check before linking to an existing beneficiary or creating one
 * pending registration.
 */
export function ReferralForm({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation()
  const apiError = useApiError()
  const { districtOptions, dsOptions } = useLookups()
  const counsellorId = useAuth((s) => s.session?.user.counsellorId)
  const [f, setF] = useState({
    source: 'hospital' as NonNullable<Referral['source']>,
    sourceOrganisation: '',
    referralDate: new Date().toISOString().slice(0, 10),
    receivingDistrictId: 'kalutara',
    receivingDsDivisionId: '',
    contactName: '',
    contactPhone: '',
    reason: '',
    urgency: 'routine' as Referral['urgency'],
    consentStatus: 'notObtained' as Referral['consentStatus'],
  })
  const [matches, setMatches] = useState<BeneficiaryMatch[] | null>(null)
  const [linked, setLinked] = useState<BeneficiaryMatch | null>(null)
  const [createPending, setCreatePending] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  // Re-run the duplicate check when identifying details change.
  useEffect(() => {
    setMatches(null)
    setLinked(null)
    setCreatePending(false)
  }, [f.contactName, f.contactPhone])

  const check = async () => {
    try {
      setMatches(await referralsApi.searchBeneficiaries({ name: f.contactName, phone: f.contactPhone }))
    } catch (e) {
      apiError.show(e)
    }
  }

  const save = async () => {
    const e: Record<string, string> = {}
    if (!f.sourceOrganisation.trim()) e.sourceOrganisation = t('errors.requiredField')
    if (!f.reason.trim()) e.reason = t('errors.requiredField')
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      await referralsApi.create({
        direction: 'inbound',
        ...f,
        receivingDsDivisionId: f.receivingDsDivisionId || undefined,
        contactName: f.contactName || undefined,
        contactPhone: f.contactPhone || undefined,
        beneficiaryId: linked?.id,
        createPending: !linked && createPending,
        counsellorId,
      })
      onSaved()
    } catch (err) {
      apiError.show(err)
    } finally {
      setBusy(false)
    }
  }

  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label={t('referrals.source')} required value={f.source} onChange={(e) => set({ source: e.target.value as typeof f.source })} options={SOURCES.map((s) => ({ value: s, label: t(`referrals.sources.${s}`) }))} />
        <Input label={t('referrals.organisation')} required value={f.sourceOrganisation} error={errors.sourceOrganisation} onChange={(e) => set({ sourceOrganisation: e.target.value })} />
        <Input label={t('referrals.referralDate')} type="date" required value={f.referralDate} onChange={(e) => set({ referralDate: e.target.value })} />
        <Select label={t('referrals.urgency')} value={f.urgency} onChange={(e) => set({ urgency: e.target.value as Referral['urgency'] })} options={(['routine', 'priority', 'urgent'] as const).map((u) => ({ value: u, label: t(`referrals.urgencies.${u}`) }))} />
        <Select label={t('referrals.receivingDistrict')} value={f.receivingDistrictId} onChange={(e) => set({ receivingDistrictId: e.target.value, receivingDsDivisionId: '' })} options={districtOptions} />
        <Select label={t('referrals.receivingDs')} value={f.receivingDsDivisionId} onChange={(e) => set({ receivingDsDivisionId: e.target.value })} placeholder="—" options={dsOptions(f.receivingDistrictId)} />
        <Input label={t('referrals.contactName')} value={f.contactName} onChange={(e) => set({ contactName: e.target.value })} />
        <Input label={t('referrals.contactPhone')} type="tel" value={f.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} />
        <Select
          label={t('referrals.consent')}
          value={f.consentStatus}
          onChange={(e) => set({ consentStatus: e.target.value as Referral['consentStatus'] })}
          options={(['obtained', 'notObtained', 'notApplicable'] as const).map((c) => ({ value: c, label: t(`referrals.consents.${c}`) }))}
        />
      </div>
      <TextArea label={t('referrals.reason')} required value={f.reason} error={errors.reason} onChange={(e) => set({ reason: e.target.value })} />

      <section aria-labelledby="dup" className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h3 id="dup" className="font-semibold">
          {t('referrals.matchTitle')}
        </h3>
        <p className="text-body-sm text-slate-600 dark:text-slate-300">{t('referrals.matchLead')}</p>
        <Button size="sm" variant="secondary" icon={<Search aria-hidden className="size-4" />} onClick={check} disabled={!f.contactName && !f.contactPhone}>
          {t('common.search')}
        </Button>
        {matches && (
          <div aria-live="polite" className="space-y-2">
            {matches.length === 0 && <p className="text-body-sm">{t('referrals.noMatches')}</p>}
            {matches.map((m) => (
              <div key={m.id} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-800">
                <div>
                  <p className="font-medium">
                    {m.name} <span className="font-mono text-body-sm">{m.clientCode}</span> {m.pendingRegistration && <Badge tone="info">{t('portal.pendingRegistration')}</Badge>}
                  </p>
                  <p className="text-caption text-slate-600 dark:text-slate-400">{t('referrals.matchedOn', { fields: m.matchedOn.map((x) => t(`referrals.matchFields.${x}`)).join(', ') })}</p>
                </div>
                <Button size="sm" variant={linked?.id === m.id ? 'primary' : 'secondary'} aria-pressed={linked?.id === m.id} onClick={() => setLinked(linked?.id === m.id ? null : m)}>
                  {linked?.id === m.id ? t('referrals.linked', { code: m.clientCode }) : t('referrals.link')}
                </Button>
              </div>
            ))}
            {!linked && (
              <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" className="size-5 accent-brand-700" checked={createPending} onChange={(e) => setCreatePending(e.target.checked)} />
                {t('referrals.createPending')}
              </label>
            )}
          </div>
        )}
      </section>
      {!matches && (f.contactName || f.contactPhone) && <Callout tone="info">{t('referrals.matchLead')}</Callout>}
      <div className="flex justify-end">
        <Button onClick={save} loading={busy} disabled={Boolean(f.contactName || f.contactPhone) && !matches}>
          {t('referrals.save')}
        </Button>
      </div>
    </div>
  )
}
