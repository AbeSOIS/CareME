import { useEffect, useRef } from 'react'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'
import { cn } from '../ui'
import { Brand } from './Brand'
import { ButterflyScene3D } from '../feature/ButterflyScene3D'
import { EmergencyButton } from './EmergencyButton'
import { Footer } from './Footer'
import { LanguageSwitcher } from './LanguageSwitcher'
import { MaintenanceBanner } from './MaintenanceBanner'
import { NotificationsMenu } from './NotificationsMenu'
import { SkipLink } from './SkipLink'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

const linkCls = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex min-h-11 items-center rounded-xl px-3 text-body font-medium whitespace-nowrap transition-colors duration-150',
    isActive ? 'bg-brand-50 text-brand-900 dark:bg-slate-800 dark:text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
  )

/** Public and beneficiary layout: top navigation, emergency button on every page. */
export function AppShell() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const open = useUi((s) => s.mobileNavOpen)
  const setOpen = useUi((s) => s.setMobileNav)
  const isBeneficiary = useAuth((s) => s.session?.effectiveRoles.includes('beneficiary'))
  const signedIn = useAuth((s) => Boolean(s.session))
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => setOpen(false), [pathname, setOpen])
  useEffect(() => {
    if (open) drawerRef.current?.querySelector<HTMLElement>('a,button')?.focus()
  }, [open])

  const links = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/self-assessment', label: t('nav.selfAssessment') },
    { to: '/counsellors', label: t('nav.findCounsellor') },
    { to: '/resources', label: t('nav.resources') },
    ...(isBeneficiary ? [{ to: '/me/appointments', label: t('nav.myAppointments') }] : []),
  ]

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <MaintenanceBanner />
      <header className="sticky top-0 z-30 border-b border-brand-900/10 bg-white/92 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
        {/* Centered within the same reading-width container as the page body. The
            language switcher collapses to a one-button dropdown here (see
            LanguageSwitcher's `variant="dropdown"`) specifically to free up the width
            that caused this to overflow and scroll when signed in — the nav still has
            overflow-x-auto as a safety net below that, but shouldn't need it now. */}
        <div className="mx-auto flex max-w-7xl min-w-0 items-center gap-2 px-4 py-2 md:min-h-[4.25rem]">
          <Brand />
          <nav aria-label={t('nav.mainNav')} className="ml-6 hidden min-w-0 flex-1 xl:block">
            {/* overflow-x-auto: if the right-side cluster (language, theme, bell, user menu)
                leaves too little room, links scroll within this box instead of spilling out
                over the neighbouring controls — flex items can't shrink below their own
                whitespace-nowrap content width, so without this they'd overlap instead. */}
            <ul className="scrollbar-thin flex items-center gap-1 overflow-x-auto">
              {links.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} end={l.end} className={linkCls}>
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <LanguageSwitcher variant="dropdown" className="max-sm:hidden" />
            <ThemeToggle />
            <NotificationsMenu />
            <UserMenu />
            <button
              type="button"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 xl:hidden dark:text-slate-200 dark:hover:bg-slate-800"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? t('nav.closeMenu') : t('nav.menu')}
              onClick={() => setOpen(!open)}
            >
              {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
            </button>
          </div>
        </div>
        {open && (
          <div id="mobile-nav" ref={drawerRef} className="border-t border-slate-200 px-4 pb-4 xl:hidden dark:border-slate-800">
            <nav aria-label={t('nav.mainNav')}>
              <ul className="flex flex-col gap-1 pt-2">
                {links.map((l) => (
                  <li key={l.to}>
                    <NavLink to={l.to} end={l.end} className={linkCls}>
                      {l.label}
                    </NavLink>
                  </li>
                ))}
                {!signedIn && (
                  <li className="sm:hidden">
                    <NavLink to="/login" className={linkCls}>
                      {t('nav.login')}
                    </NavLink>
                  </li>
                )}
                <li>
                  <NavLink to="/emergency" className={({ isActive }) => cn(linkCls({ isActive }), 'text-red-700 dark:text-red-400')}>
                    {t('nav.emergency')}
                  </NavLink>
                </li>
              </ul>
            </nav>
            <LanguageSwitcher className="mt-3 md:hidden" />
          </div>
        )}
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 pb-24 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <EmergencyButton />
      {/* Mounted once here, not per-page, so the swarm keeps flying across route changes
          instead of resetting every time you navigate. */}
      <ButterflyScene3D />
    </div>
  )
}
