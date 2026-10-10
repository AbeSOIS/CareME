import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApiError } from '../../hooks/useApiError'
import { bookingApi, type BookRequest } from '../../services/api'
import { Button, Callout, Checkbox, Input, Select } from '../ui'

type Guardian = NonNullable<BookRequest['guardian']>

/**
 * Parent / caregiver consent for minors before any session (FR-085, Annex 6 Part C).
 * The confirmation method and safeguarding route are placeholders pending the Ministry.
 */
export function ConsentGate({ ageThreshold, onConsent, onBack }: { ageThreshold: number; onConsent: (g: Guardian) => void; onBack: () => void }) {
  const { t } = useTranslation()
  const apiError = useApiError()
  const [g, setG] = useState<Guardian>({ guardianName: '', relationship: 'mother', guardianContact: '', authorityConfirmation: 'selfDeclared', consentGiven: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [noCaregiver, setNoCaregiver] = useState(false)
  const [safePhone, setSafePhone] = useState('')
  const [safeSent, setSafeSent] = useState(false)

  const submit = () => {
    const e: Record<string, string> = {}
    if (!g.guardianName.trim()) e.guardianName = t('errors.requiredField')
    if (!/^0\d{9}$/.test(g.guardianContact.replace(/\s/g, ''))) e.guardianContact = t('errors.invalidPhone')
    if (!g.consentGiven) e.consentGiven = t('errors.consentRequired')
    setErrors(e)
    if (!Object.keys(e).length) onConsent({ ...g, guardianContact: g.guardianContact.replace(/\s/g, '') })
  }

  return (
    <div className="space-y-5">
      <Callout tone="info" title={t('booking.minorTitle')}>
        {t('booking.minorLead', { age: ageThreshold })}
      </Callout>
      {!noCaregiver ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t('booking.guardianName')} required value={g.guardianName} error={errors.guardianName} onChange={(e) => setG({ ...g, guardianName: e.target.value })} />
            <Select
              label={t('booking.relationship')}
              required
              value={g.relationship}
              onChange={(e) => setG({ ...g, relationship: e.target.value as Guardian['relationship'] })}
              options={(['mother', 'father', 'legalGuardian', 'caregiver', 'other'] as const).map((r) => ({ value: r, label: t(`booking.relationships.${r}`) }))}
            />
            <Input
              label={t('booking.guardianContact')}
              required
              type="tel"
              inputMode="tel"
              value={g.guardianContact}
              error={errors.guardianContact}
              onChange={(e) => setG({ ...g, guardianContact: e.target.value })}
            />
            <Select
              label={t('booking.authority')}
              value={g.authorityConfirmation}
              onChange={(e) => setG({ ...g, authorityConfirmation: e.target.value as Guardian['authorityConfirmation'] })}
              options={(['selfDeclared', 'documentSighted', 'officerVerified'] as const).map((r) => ({ value: r, label: t(`booking.authorityOptions.${r}`) }))}
            />
          </div>
          <div>
            <Checkbox label={t('booking.guardianConsent')} checked={g.consentGiven} onChange={(e) => setG({ ...g, consentGiven: e.target.checked })} aria-invalid={errors.consentGiven ? true : undefined} />
            {errors.consentGiven && (
              <p role="alert" className="mt-1 text-body-sm font-medium text-red-700 dark:text-red-400">
                {errors.consentGiven}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onBack}>
              {t('common.back')}
            </Button>
            <Button onClick={submit}>{t('common.continue')}</Button>
          </div>
          <Button variant="ghost" onClick={() => setNoCaregiver(true)}>
            {t('booking.noSafeCaregiver')}
          </Button>
        </>
      ) : safeSent ? (
        <Callout tone="success" role="status">
          {t('booking.safeguardingSent')}
        </Callout>
      ) : (
        <div className="space-y-4">
          <Callout tone="warning" title={t('booking.safeguardingTitle')}>
            {t('booking.safeguardingBody')}
          </Callout>
          <Input label={t('booking.safeguardingPhone')} type="tel" inputMode="tel" value={safePhone} onChange={(e) => setSafePhone(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setNoCaregiver(false)}>
              {t('common.back')}
            </Button>
            <Button
              onClick={async () => {
                try {
                  await bookingApi.safeguarding(safePhone || undefined)
                  setSafeSent(true)
                } catch (e) {
                  apiError.show(e)
                }
              }}
            >
              {t('booking.safeguardingSend')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
