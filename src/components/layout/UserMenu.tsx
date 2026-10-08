import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { ButtonLink } from '../ui'
import { homeFor } from '../../routes/homeFor'

export function UserMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useAuth((s) => s.session)
  const logout = useAuth((s) => s.logout)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!session) {
    return (
      // On phones the login link lives in the menu drawer so the header never overflows.
      <ButtonLink to="/login" size="sm" variant="secondary" className="max-sm:hidden">
        {t('nav.login')}
      </ButtonLink>
    )
  }

  const roles = session.effectiveRoles
  const home = homeFor(roles)
  const itemCls = 'flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        <UserRound aria-hidden className="size-5" />
        <span className="hidden max-w-32 truncate sm:inline">{session.user.displayName}</span>
        <ChevronDown aria-hidden className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{roles.filter((r) => r !== 'anonymous').map((r) => t(`roles.${r}`)).join(' · ')}</p>
          <Link to={home} onClick={() => setOpen(false)} className={itemCls}>
            {roles.includes('beneficiary') ? t('nav.account') : roles.includes('counsellor') ? t('nav.counsellorPortal') : t('nav.adminPortal')}
          </Link>
          <Link to="/account/security" onClick={() => setOpen(false)} className={itemCls}>
            {t('nav.security')}
          </Link>
          <button
            type="button"
            className={`${itemCls} text-red-700 dark:text-red-400`}
            onClick={async () => {
              setOpen(false)
              await logout()
              navigate('/')
            }}
          >
            <LogOut aria-hidden className="size-4" />
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
