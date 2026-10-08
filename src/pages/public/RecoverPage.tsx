import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, Callout, Card, Input } from '../../components/ui'
import { DEMO_OTP } from '../../config/defaults'
import { authApi } from '../../services/api'
import { errorCode } from '../../services/mockApi'

/** Self-service password recovery via a verified channel (FR-005). */
export function RecoverPage() {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [challenge, setChallenge] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">{t('auth.recoverTitle')}</h1>
      {done ? (
        <div className="mt-4 space-y-4">
          <Callout tone="success" role="status">
            {t('auth.resetDone')}
          </Callout>
          <Link to="/login" className="font-semibold text-brand-800 hover:underline dark:text-brand-200">
            {t('auth.loginButton')}
          </Link>
        </div>
      ) : !challenge ? (
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            try {
              setChallenge((await authApi.recover(username)).challengeId)
            } finally {
              setBusy(false)
            }
          }}
        >
          <p className="text-slate-600 dark:text-slate-300">{t('auth.recoverLead')}</p>
          <Input label={t('auth.username')} required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Button type="submit" loading={busy}>
            {t('auth.sendCode')}
          </Button>
        </form>
      ) : (
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
              setError(t('errors.passwordWeak'))
              return
            }
            setBusy(true)
            setError(null)
            try {
              await authApi.resetPassword(challenge, otp, password)
              setDone(true)
            } catch (err) {
              setError(t(`errors.${errorCode(err)}`))
            } finally {
              setBusy(false)
            }
          }}
        >
          <Input label={t('auth.otp')} hint={t('auth.demoOtp', { code: DEMO_OTP })} required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
          <Input label={t('auth.newPassword')} hint={t('auth.passwordHint')} required type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && (
            <Callout tone="danger" role="alert">
              {error}
            </Callout>
          )}
          <Button type="submit" loading={busy}>
            {t('auth.resetButton')}
          </Button>
        </form>
      )}
    </Card>
  )
}
