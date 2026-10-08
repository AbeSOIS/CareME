import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Badge, Button, Callout, Card, Input } from '../../components/ui'
import { DEMO_OTP, DEMO_PASSWORD } from '../../config/defaults'
import { authApi } from '../../services/api'
import { errorCode, errorDetails } from '../../services/mockApi'
import { homeFor } from '../../routes/homeFor'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'
import type { AuthSession } from '../../types'

const DEMO = [
  { username: 'nimali@example.lk', role: 'beneficiary', note: 'Upcoming session in a few minutes' },
  { username: 'sanduni@example.lk', role: 'beneficiary', note: '8 of 8 sessions used' },
  { username: '0770000103', role: 'beneficiary', note: 'Minor with guardian consent' },
  { username: 'dilini@careme.gov.lk', role: 'counsellor', note: 'Emergency Officer this week' },
  { username: 'tharshini@careme.gov.lk', role: 'counsellor', note: 'Tamil / Sinhala / English' },
  { username: 'admin@careme.gov.lk', role: 'admin', note: `MFA code ${DEMO_OTP}` },
  { username: 'analyst@careme.gov.lk', role: 'analyst', note: 'Dashboard and reports' },
] as const

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const setSession = useAuth((s) => s.setSession)
  const endedReason = useAuth((s) => s.endedReason)
  const setLanguage = useUi((s) => s.setLanguage)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [challenge, setChallenge] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const finish = (session: AuthSession) => {
    setSession(session)
    setLanguage(session.user.preferredLanguage)
    navigate(from ?? homeFor(session.effectiveRoles), { replace: true })
  }

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await authApi.login(username, password)
      if ('mfaRequired' in res) setChallenge(res.challengeId)
      else finish(res)
    } catch (err) {
      const code = errorCode(err)
      const remaining = errorDetails(err)?.remaining as number | undefined
      setError(`${t(`errors.${code}`)}${remaining !== undefined && remaining <= 3 ? ` ${t('auth.attemptsRemaining', { count: remaining })}` : ''}`)
    } finally {
      setBusy(false)
    }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      finish(await authApi.mfa(challenge!, otp))
    } catch (err) {
      setError(t(`errors.${errorCode(err)}`))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_22rem]">
      <Card className="max-w-xl">
        {!challenge ? (
          <>
            <h1 className="text-2xl font-bold">{t('auth.loginTitle')}</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{t('auth.loginLead')}</p>
            {endedReason && (
              <Callout tone="info" className="mt-4" role="status">
                {t(endedReason === 'timeout' ? 'auth.endedTimeout' : endedReason === 'revoked' ? 'auth.endedRevoked' : 'auth.endedExpired')}
              </Callout>
            )}
            {from && !endedReason && (
              <Callout tone="info" className="mt-4">
                {t('common.loginToContinue')}
              </Callout>
            )}
            <form className="mt-6 space-y-4" onSubmit={login}>
              <Input label={t('auth.username')} required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              <Input
                label={t('auth.password')}
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="flex min-h-9 items-center gap-2 text-sm">
                <input type="checkbox" className="size-5 accent-brand-700" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
                {t('auth.showPassword')}
              </label>
              {error && (
                <Callout tone="danger" role="alert">
                  {error}
                </Callout>
              )}
              <Button type="submit" loading={busy} className="w-full">
                {t('auth.loginButton')}
              </Button>
            </form>
            <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:justify-between">
              <Link to="/recover" className="font-medium text-brand-800 underline-offset-2 hover:underline dark:text-brand-200">
                {t('auth.forgotPassword')}
              </Link>
              <span>
                {t('auth.noAccount')}{' '}
                <Link to="/register" className="font-medium text-brand-800 underline-offset-2 hover:underline dark:text-brand-200">
                  {t('auth.createAccount')}
                </Link>
              </span>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{t('auth.mfaTitle')}</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{t('auth.mfaLead')}</p>
            <form className="mt-6 space-y-4" onSubmit={verify}>
              <Input
                label={t('auth.otp')}
                hint={t('auth.demoOtp', { code: DEMO_OTP })}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
              {error && (
                <Callout tone="danger" role="alert">
                  {error}
                </Callout>
              )}
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setChallenge(null)}>
                  {t('common.back')}
                </Button>
                <Button type="submit" loading={busy} className="flex-1">
                  {t('auth.verify')}
                </Button>
              </div>
            </form>
          </>
        )}
      </Card>

      <aside aria-labelledby="demo-accounts" className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 p-5 dark:border-brand-800 dark:bg-slate-900">
        <h2 id="demo-accounts" className="font-semibold">
          {t('auth.demoAccounts')}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('auth.demoAccountsLead', { password: DEMO_PASSWORD })}</p>
        <ul className="mt-3 space-y-2">
          {DEMO.map((d) => (
            <li key={d.username}>
              <button
                type="button"
                onClick={() => {
                  setUsername(d.username)
                  setPassword(DEMO_PASSWORD)
                  setChallenge(null)
                  setError(null)
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:border-brand-400 dark:border-slate-700 dark:bg-slate-950"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{t(`roles.${d.role}`)}</Badge>
                  <span className="text-sm font-medium break-all">{d.username}</span>
                </span>
                <span className="mt-1 block text-xs text-slate-600 dark:text-slate-400" lang="en">
                  {d.note}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
