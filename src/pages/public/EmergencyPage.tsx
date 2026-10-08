import { useState } from 'react'
import { Siren } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AlertStatusCard } from '../../components/feature/AlertStatusCard'
import { EmergencyInfo } from '../../components/feature/EmergencyInfo'
import { Button, ButtonLink, Card, Input, TextArea } from '../../components/ui'
import { useApiError } from '../../hooks/useApiError'
import { useAlerts } from '../../store/alerts'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'

export function EmergencyPage() {
  const { t } = useTranslation()
  const apiError = useApiError()
  const toast = useUi((s) => s.toast)
  const raise = useAlerts((s) => s.raise)
  const raisedId = useAlerts((s) => s.raisedId)
  const raisedStatus = useAlerts((s) => s.raisedStatus)
  const isRegistered = useAuth((s) => Boolean(s.session?.user.beneficiaryId))
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const active = raisedId && raisedStatus?.status !== 'closed'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-red-800 dark:text-red-300">
          <Siren aria-hidden className="size-8" />
          {t('emergency.title')}
        </h1>
        <p className="mt-2 text-lg">{t('emergency.lead')}</p>
      </div>

      <EmergencyInfo compact />
      <AlertStatusCard />

      {!active && (
        <Card>
          <h2 className="text-xl font-semibold">{t('emergency.alertTitle')}</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-300">{t('emergency.alertBody')}</p>
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              try {
                // FR-059: a phone number is requested but never required.
                await raise({ message, contactPhone: phone || undefined })
                toast(t('emergency.sent'), 'success')
                setMessage('')
                setPhone('')
              } catch (err) {
                apiError.show(err)
              } finally {
                setBusy(false)
              }
            }}
          >
            <TextArea label={t('emergency.message')} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
            {!isRegistered && (
              <Input label={t('emergency.phoneOptional')} hint={t('emergency.phoneHint')} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            )}
            <Button type="submit" variant="emergency" size="lg" loading={busy} icon={<Siren aria-hidden className="size-5" />} className="w-full sm:w-auto">
              {t('emergency.send')}
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold">{t('emergency.stepsTitle')}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          <li>{t('emergency.step1')}</li>
          <li>{t('emergency.step2')}</li>
          <li>{t('emergency.step3')}</li>
        </ol>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="text-slate-600 dark:text-slate-300">{t('emergency.notEmergency')}</p>
        <ButtonLink to="/counsellors" variant="secondary" size="sm">
          {t('nav.findCounsellor')}
        </ButtonLink>
      </div>
    </div>
  )
}
