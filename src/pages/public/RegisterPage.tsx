import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Stepper, Button, Callout, Card, Checkbox, Input, Select } from '../../components/ui'
import { DEMO_OTP } from '../../config/defaults'
import { useLookups } from '../../hooks/useLookups'
import { authApi } from '../../services/api'
import { errorCode } from '../../services/mockApi'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'
import type { LanguageCode } from '../../types'

const schema = z
  .object({
    fullName: z.string().trim().min(2, 'requiredField'),
    phone: z.string().trim().regex(/^0\d{9}$/, 'invalidPhone'),
    email: z.union([z.literal(''), z.email('invalidEmail')]),
    dateOfBirth: z.string(),
    districtId: z.string(),
    preferredLanguage: z.enum(['si', 'ta', 'en']),
    password: z.string().regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, 'passwordWeak'),
    confirm: z.string(),
    agree: z.literal(true, { error: 'consentRequired' }),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'passwordsMustMatch' })
type Form = z.infer<typeof schema>

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { districtOptions } = useLookups()
  const language = useUi((s) => s.language)
  const setSession = useAuth((s) => s.setSession)
  const [challenge, setChallenge] = useState<{ id: string; phone: string } | null>(null)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', phone: '', email: '', dateOfBirth: '', districtId: '', preferredLanguage: language, password: '', confirm: '', agree: undefined as unknown as true },
  })
  const err = (code?: string) => (code ? (code === 'passwordsMustMatch' ? t('auth.passwordsMustMatch') : t(`errors.${code}`)) : undefined)
  const e = form.formState.errors

  const registerSteps = [t('auth.stepDetails'), t('auth.stepVerify'), t('auth.stepDone')]

  return (
    <Card className="mx-auto max-w-2xl">
      <Stepper className="mb-6" label={t('auth.registerSteps')} current={challenge ? 1 : 0} steps={registerSteps} />
      {!challenge ? (
        <>
          <h1 className="text-h1">{t('auth.registerTitle')}</h1>
          <p className="mt-1 max-w-prose text-lead text-slate-600 dark:text-slate-300">{t('auth.registerLead')}</p>
          <form
            noValidate
            className="mt-6 space-y-4"
            onSubmit={form.handleSubmit(async (v) => {
              setBusy(true)
              setError(null)
              try {
                const res = await authApi.register({
                  fullName: v.fullName,
                  phone: v.phone,
                  email: v.email || undefined,
                  password: v.password,
                  preferredLanguage: v.preferredLanguage as LanguageCode,
                  dateOfBirth: v.dateOfBirth || undefined,
                  districtId: v.districtId || undefined,
                })
                setChallenge({ id: res.challengeId, phone: v.phone })
              } catch (ex) {
                setError(t(`errors.${errorCode(ex)}`))
              } finally {
                setBusy(false)
              }
            })}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('auth.fullName')} required autoComplete="name" {...form.register('fullName')} error={err(e.fullName?.message)} />
              <Input label={t('auth.mobile')} required type="tel" inputMode="tel" autoComplete="tel" placeholder="07XXXXXXXX" {...form.register('phone')} error={err(e.phone?.message)} />
              <Input label={t('auth.email')} type="email" autoComplete="email" {...form.register('email')} error={err(e.email?.message)} />
              <Input label={t('auth.dateOfBirth')} type="date" {...form.register('dateOfBirth')} />
              <Select label={t('auth.district')} {...form.register('districtId')} placeholder={t('common.optional')} options={districtOptions} />
              <Select
                label={t('auth.preferredLanguage')}
                {...form.register('preferredLanguage')}
                options={(['si', 'ta', 'en'] as const).map((l) => ({ value: l, label: t(`lang.${l}`) }))}
              />
              <Input
                label={t('auth.password')}
                required
                type="password"
                autoComplete="new-password"
                hint={t('auth.passwordHint')}
                {...form.register('password')}
                error={err(e.password?.message)}
              />
              <Input label={t('auth.confirmPassword')} required type="password" autoComplete="new-password" {...form.register('confirm')} error={err(e.confirm?.message)} />
            </div>
            <div>
              <Checkbox label={t('auth.agreeTerms')} {...form.register('agree')} />
              {e.agree && (
                <p role="alert" className="mt-1 text-body-sm font-medium text-red-700 dark:text-red-400">
                  {t('errors.consentRequired')}
                </p>
              )}
            </div>
            {error && (
              <Callout tone="danger" role="alert">
                {error}
              </Callout>
            )}
            <Button type="submit" loading={busy}>
              {t('auth.registerButton')}
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-h1">{t('auth.verifyPhoneTitle')}</h1>
          <p className="mt-1 max-w-prose text-lead text-slate-600 dark:text-slate-300">{t('auth.verifyPhoneLead', { phone: challenge.phone })}</p>
          <form
            className="mt-6 space-y-4"
            onSubmit={async (ev) => {
              ev.preventDefault()
              setBusy(true)
              setError(null)
              try {
                const session = await authApi.verifyRegistration(challenge.id, otp)
                setSession(session)
                navigate('/me', { replace: true })
              } catch (ex) {
                setError(t(`errors.${errorCode(ex)}`))
              } finally {
                setBusy(false)
              }
            }}
          >
            <Input label={t('auth.otp')} hint={t('auth.demoOtp', { code: DEMO_OTP })} required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, ''))} autoFocus />
            {error && (
              <Callout tone="danger" role="alert">
                {error}
              </Callout>
            )}
            <Button type="submit" loading={busy}>
              {t('auth.verify')}
            </Button>
          </form>
        </>
      )}
    </Card>
  )
}
