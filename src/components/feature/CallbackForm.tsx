import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApiError } from '../../hooks/useApiError'
import { bookingApi } from '../../services/api'
import type { CounsellingLanguage } from '../../types'
import { Button, Callout, Input, RadioGroup } from '../ui'

export function CallbackForm({ districtId, language }: { districtId?: string; language: CounsellingLanguage }) {
  const { t } = useTranslation()
  const apiError = useApiError()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [kind, setKind] = useState<'callback' | 'waitlist'>('callback')
  const [phoneError, setPhoneError] = useState<string>()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  if (sent) return <Callout tone="success" role="status">{t('search.callbackSent')}</Callout>

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!/^0\d{9}$/.test(phone.replace(/\s/g, ''))) {
          setPhoneError(t('errors.invalidPhone'))
          return
        }
        setBusy(true)
        try {
          await bookingApi.waitlist({ contactName: name || '—', contactPhone: phone.replace(/\s/g, ''), districtId, language, kind })
          setSent(true)
        } catch (err) {
          apiError.show(err)
        } finally {
          setBusy(false)
        }
      }}
    >
      <RadioGroup
        name="kind"
        legend={t('search.callbackKind')}
        inline
        value={kind}
        onChange={(v) => setKind(v as typeof kind)}
        options={[
          { value: 'callback', label: t('search.callback') },
          { value: 'waitlist', label: t('search.waitlist') },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t('search.contactName')} value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
        <Input
          label={t('search.contactPhone')}
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          error={phoneError}
          onChange={(e) => {
            setPhone(e.target.value)
            setPhoneError(undefined)
          }}
        />
      </div>
      <Button type="submit" loading={busy}>
        {t('search.requestCallback')}
      </Button>
    </form>
  )
}
