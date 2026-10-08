import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import { EmergencyInfo } from '../../components/feature/EmergencyInfo'
import { SlotPicker } from '../../components/feature/SlotPicker'
import { ConsentGate } from '../../components/forms/ConsentGate'
import { Badge, Button, ButtonLink, Callout, Card, Checkbox, Input, RadioGroup, Select, Spinner } from '../../components/ui'
import { isMinor } from '../../domain/age'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import { beneficiaryApi, bookingApi, type BookRequest } from '../../services/api'
import { errorCode } from '../../services/mockApi'
import { useAuth } from '../../store/auth'
import { useSettings } from '../../store/settings'
import type { AppointmentView, CounsellingLanguage, SessionMode, Slot } from '../../types'
import { NotFoundPage } from './NotFoundPage'

type Step = 'time' | 'details' | 'consent' | 'review' | 'done'

const detailsSchema = z.object({
  fullName: z.string().trim().min(2, 'requiredField'),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{9}$/, 'invalidPhone'),
  email: z.union([z.literal(''), z.email('invalidEmail')]),
  dateOfBirth: z.string().min(1, 'requiredField'),
  gender: z.enum(['female', 'male', 'other', 'undisclosed']),
  districtId: z.string(),
  consent: z.literal(true, { error: 'consentRequired' }),
})
type Details = z.infer<typeof detailsSchema>

export function BookingPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const navigate = useNavigate()
  const { id } = useParams()
  const [params] = useSearchParams()
  const apiError = useApiError()
  const { districtName, districtOptions } = useLookups()
  const settings = useSettings((s) => s.settings)
  const session = useAuth((s) => s.session)
  const setSession = useAuth((s) => s.setSession)
  const isBeneficiary = Boolean(session?.effectiveRoles.includes('beneficiary'))
  const isStaff = Boolean(session && !isBeneficiary)

  const data = useAsync(() => bookingApi.counsellor(id!), [id])
  const profile = useAsync(() => (isBeneficiary ? beneficiaryApi.profile() : Promise.resolve(null)), [isBeneficiary])
  const used = useAsync(() => (isBeneficiary ? bookingApi.mine() : Promise.resolve([] as AppointmentView[])), [isBeneficiary])

  const [step, setStep] = useState<Step>('time')
  const [slot, setSlot] = useState<Slot | null>(null)
  const [mode, setMode] = useState<SessionMode>('video')
  const [language, setLanguage] = useState<CounsellingLanguage | ''>((params.get('language') as CounsellingLanguage) || '')
  const [details, setDetails] = useState<Details | null>(null)
  const [guardian, setGuardian] = useState<BookRequest['guardian']>()
  const [registeredConsent, setRegisteredConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AppointmentView | null>(null)
  const [blockingError, setBlockingError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const form = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { fullName: '', phone: '', email: '', dateOfBirth: '', gender: 'undisclosed', districtId: '', consent: undefined as unknown as true },
  })

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const counsellor = data.data?.counsellor
  useEffect(() => {
    if (counsellor && !language) setLanguage(counsellor.languages[0])
  }, [counsellor, language])

  if (data.loading) return <Spinner label={t('common.loading')} />
  if (data.error || !counsellor) return <NotFoundPage />

  const sessionsUsed = (used.data ?? []).filter((a) => ['requested', 'confirmed', 'completed', 'noShow', 'lateCancelled'].includes(a.status)).length
  const capReached = isBeneficiary && sessionsUsed >= settings.maxSessionsPerClient
  const dob = profile.data?.dateOfBirth ?? details?.dateOfBirth
  const minor = isMinor(dob, settings.minorAgeThreshold)
  const needsGuardian = minor && !profile.data?.guardianConsent?.consentGiven
  const steps: Step[] = ['time', 'details', ...(needsGuardian ? (['consent'] as Step[]) : []), 'review']
  const stepIndex = steps.indexOf(step) + 1

  const afterDetails = () => setStep(needsGuardianFor(details?.dateOfBirth) ? 'consent' : 'review')
  function needsGuardianFor(birth?: string) {
    return isMinor(profile.data?.dateOfBirth ?? birth, settings.minorAgeThreshold) && !profile.data?.guardianConsent?.consentGiven
  }

  const submit = async () => {
    if (!slot || !language) return
    setBusy(true)
    setBlockingError(null)
    try {
      const res = await bookingApi.book({
        counsellorId: counsellor.id,
        slotId: slot.id,
        mode,
        language,
        consent: true,
        details: details ? { fullName: details.fullName, phone: details.phone, email: details.email || undefined, dateOfBirth: details.dateOfBirth, gender: details.gender, districtId: details.districtId || undefined } : undefined,
        guardian,
      })
      if (res.session) setSession(res.session)
      setResult(res.appointment)
      setStep('done')
    } catch (e) {
      const code = errorCode(e)
      if (code === 'slotUnavailable') {
        await data.reload()
        setSlot(null)
        setStep('time')
      }
      setBlockingError(code === 'sessionCap' ? t('booking.capReached', { max: settings.maxSessionsPerClient }) : apiError.message(e))
    } finally {
      setBusy(false)
    }
  }

  const header = (
    <div className="mb-6">
      <Link to="/counsellors" className="text-sm font-medium text-brand-800 hover:underline dark:text-brand-200">
        ← {t('nav.findCounsellor')}
      </Link>
      <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-2xl font-bold focus:outline-none sm:text-3xl">
        {step === 'done' ? t('booking.requestedTitle') : t('booking.title')}
      </h1>
      <p className="text-slate-600 dark:text-slate-300">
        {t('booking.with', { name: counsellor.fullName })} · {districtName(counsellor.districtId)}
      </p>
      {step !== 'done' && <p className="mt-1 text-sm font-medium text-brand-800 dark:text-brand-200">{t('booking.step', { current: stepIndex, total: steps.length })}</p>}
    </div>
  )

  if (isStaff) {
    return (
      <div className="mx-auto max-w-3xl">
        {header}
        <Callout tone="warning">{t('errors.staffCannotBook')}</Callout>
      </div>
    )
  }

  if (capReached && step !== 'done') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {header}
        <Callout tone="warning" title={t('appointments.sessionsUsed', { used: sessionsUsed, max: settings.maxSessionsPerClient })}>
          {t('booking.capReached', { max: settings.maxSessionsPerClient })}
        </Callout>
        <EmergencyInfo />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {header}
      {blockingError && (
        <Callout tone="danger" role="alert">
          {blockingError}
        </Callout>
      )}

      {step === 'time' && (
        <Card className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">{t('booking.chooseTime')}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('booking.chooseTimeLead', { minutes: settings.maxSessionDurationMin })}</p>
          </div>
          <SlotPicker slots={data.data!.slots} value={slot?.id ?? null} onChange={(s) => {
            setSlot(s)
            if (!s.modes.includes(mode)) setMode(s.modes[0])
          }} label={t('booking.chooseTime')} />
          {slot && (
            <RadioGroup
              name="mode"
              legend={t('booking.mode')}
              inline
              value={mode}
              onChange={(v) => setMode(v as SessionMode)}
              options={slot.modes.map((m) => ({ value: m, label: t(`booking.modes.${m}`) }))}
            />
          )}
          <RadioGroup
            name="language"
            legend={t('booking.language')}
            inline
            value={language}
            onChange={(v) => setLanguage(v as CounsellingLanguage)}
            options={counsellor.languages.map((l) => ({ value: l, label: t(`lang.${l}`) }))}
          />
          <div className="flex justify-end">
            <Button disabled={!slot || !language} onClick={() => setStep('details')}>
              {t('common.continue')}
            </Button>
          </div>
        </Card>
      )}

      {step === 'details' && (
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">{t('booking.yourDetails')}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('booking.detailsLead')}</p>
          </div>
          {isBeneficiary ? (
            <>
              <Callout tone="info">{t('booking.loggedInAs', { name: profile.data?.preferredName ?? session?.user.displayName })}</Callout>
              <Checkbox label={t('booking.consentCounselling')} checked={registeredConsent} onChange={(e) => setRegisteredConsent(e.target.checked)} />
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="secondary" onClick={() => setStep('time')}>
                  {t('common.back')}
                </Button>
                <Button disabled={!registeredConsent} onClick={afterDetails}>
                  {t('common.continue')}
                </Button>
              </div>
            </>
          ) : (
            <form
              noValidate
              className="space-y-4"
              onSubmit={form.handleSubmit((d) => {
                setDetails(d)
                setStep(needsGuardianFor(d.dateOfBirth) ? 'consent' : 'review')
              })}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('auth.fullName')} required autoComplete="name" {...form.register('fullName')} error={fieldError(form.formState.errors.fullName?.message)} />
                <Input label={t('auth.mobile')} required type="tel" inputMode="tel" autoComplete="tel" placeholder="07XXXXXXXX" {...form.register('phone')} error={fieldError(form.formState.errors.phone?.message)} />
                <Input label={t('auth.email')} type="email" autoComplete="email" {...form.register('email')} error={fieldError(form.formState.errors.email?.message)} />
                <Input label={t('auth.dateOfBirth')} required type="date" max={new Date().toISOString().slice(0, 10)} {...form.register('dateOfBirth')} error={fieldError(form.formState.errors.dateOfBirth?.message)} />
                <Select
                  label={t('auth.gender')}
                  {...form.register('gender')}
                  options={(['female', 'male', 'other', 'undisclosed'] as const).map((g) => ({ value: g, label: t(`gender.${g}`) }))}
                />
                <Select label={t('auth.district')} {...form.register('districtId')} placeholder={t('common.optional')} options={districtOptions} />
              </div>
              <div>
                <Checkbox label={t('booking.consentCounselling')} {...form.register('consent')} aria-invalid={form.formState.errors.consent ? true : undefined} />
                {form.formState.errors.consent && (
                  <p role="alert" className="mt-1 text-sm font-medium text-red-700 dark:text-red-400">
                    {t('errors.consentRequired')}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="secondary" onClick={() => setStep('time')}>
                  {t('common.back')}
                </Button>
                <Button type="submit">{t('common.continue')}</Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {step === 'consent' && (
        <Card>
          <ConsentGate
            ageThreshold={settings.minorAgeThreshold}
            onBack={() => setStep('details')}
            onConsent={(g) => {
              setGuardian(g)
              setStep('review')
            }}
          />
        </Card>
      )}

      {step === 'review' && slot && (
        <Card className="space-y-5">
          <h2 className="text-lg font-semibold">{t('booking.review')}</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Row label={t('common.date')} value={fmt.dateLong(slot.start)} />
            <Row label={t('common.time')} value={`${fmt.time(slot.start)} · ${t('common.minutes', { count: slot.durationMin })}`} />
            <Row label={t('booking.mode')} value={t(`booking.modes.${mode}`)} />
            <Row label={t('booking.language')} value={t(`lang.${language}`)} />
            <Row label={t('portal.client')} value={details?.fullName ?? profile.data?.fullName ?? ''} />
            {guardian && <Row label={t('booking.guardianName')} value={`${guardian.guardianName} (${t(`booking.relationships.${guardian.relationship}`)})`} />}
          </dl>
          {isBeneficiary && <p className="text-sm">{t('booking.sessionNumber', { n: sessionsUsed + 1, max: settings.maxSessionsPerClient })}</p>}
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep(needsGuardian || guardian ? 'consent' : 'details')}>
              {t('common.back')}
            </Button>
            <Button loading={busy} onClick={submit}>
              {t('booking.confirmBooking')}
            </Button>
          </div>
        </Card>
      )}

      {step === 'done' && result && (
        <div className="space-y-6">
          <Callout tone="success" title={t('appointments.status.requested')} role="status">
            {t('booking.requestedBody')}
          </Callout>
          <Card>
            <div className="flex items-center gap-3">
              <CircleCheck aria-hidden className="size-8 text-emerald-600" />
              <div>
                <p className="font-semibold">{fmt.dateLong(result.start)}</p>
                <p className="text-slate-600 dark:text-slate-300">
                  {fmt.time(result.start)} · {t(`booking.modes.${result.mode}`)} · {t(`lang.${result.language}`)}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold">{t('booking.previewTitle')}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('booking.previewBody')}</p>
            <div className="mt-3 max-w-sm rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
              <Badge>SMS</Badge>
              <p className="mt-2">{t('booking.previewSms', { date: fmt.date(result.start), time: fmt.time(result.start) })}</p>
            </div>
          </Card>
          {details && <Callout tone="info">{t('auth.guestNotice')}</Callout>}
          <div className="flex flex-wrap gap-2">
            <ButtonLink to="/me/appointments">{t('booking.goToAppointments')}</ButtonLink>
            <Button variant="secondary" onClick={() => navigate('/')}>
              {t('common.goHome')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  function fieldError(code?: string) {
    return code ? t(`errors.${code}`) : undefined
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
      <dt className="text-sm text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}
