import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceSessions } from '../../components/feature/DeviceSessions'
import { Button, Card, Checkbox, Input, PageHeader } from '../../components/ui'
import { useApiError } from '../../hooks/useApiError'
import { authApi } from '../../services/api'
import { useAuth } from '../../store/auth'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'

export function SecurityPage() {
  const { t } = useTranslation()
  const session = useAuth((s) => s.session)!
  const updateUser = useAuth((s) => s.updateUser)
  const mfaRoles = useSettings((s) => s.settings.mfaRequiredRoles)
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [pwError, setPwError] = useState<string>()
  const requiredByRole = session.user.roles.some((r) => mfaRoles.includes(r))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t('nav.security')} />
      <Card>
        <h2 className="text-lg font-semibold">{t('auth.mfaSetting')}</h2>
        <Checkbox
          className="mt-3"
          label={t('auth.mfaSetting')}
          description={requiredByRole ? t('auth.mfaRequiredByRole') : t('auth.mfaSettingBody')}
          checked={requiredByRole || session.user.mfaEnabled}
          disabled={requiredByRole}
          onChange={async (e) => {
            try {
              updateUser(await authApi.setMfa(e.target.checked))
              toast(t('common.saved'), 'success')
            } catch (err) {
              apiError.show(err)
            }
          }}
        />
      </Card>
      <DeviceSessions />
      <Card>
        <h2 className="text-lg font-semibold">{t('auth.changePassword')}</h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(next)) {
              setPwError(t('errors.passwordWeak'))
              return
            }
            try {
              await authApi.changePassword(current, next)
              setCurrent('')
              setNext('')
              setPwError(undefined)
              toast(t('auth.passwordChanged'), 'success')
            } catch (err) {
              apiError.show(err)
            }
          }}
        >
          <Input label={t('auth.currentPassword')} required type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          <Input label={t('auth.newPassword')} hint={t('auth.passwordHint')} required type="password" autoComplete="new-password" value={next} error={pwError} onChange={(e) => setNext(e.target.value)} />
          <div className="sm:col-span-2">
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
