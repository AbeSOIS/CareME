import { useEffect, useRef, type ComponentType } from 'react'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useUi } from '../../store/ui'
import { cn } from '../ui'
import { Brand } from './Brand'
import { LanguageSwitcher } from './LanguageSwitcher'
import { MaintenanceBanner } from './MaintenanceBanner'
import { NotificationsMenu } from './NotificationsMenu'
import { SkipLink } from './SkipLink'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

export interface SidebarItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  end?: boolean
  badge?: number
  /**
   * Already-translated section heading. Items are grouped in the order given, so
   * a long staff sidebar reads as a few short lists instead of one flat run.
   * Role gating stays entirely in router.tsx — this is presentation only.
   */
  group?: string
}

const linkCls = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-11 items-start gap-3 rounded-xl px-3 py-2.5 text-body-sm leading-snug font-medium transition-colors duration-150',
    isActive ? 'bg-brand-700 text-white dark:bg-brand-400 dark:text-slate-950' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
  )

function SidebarLinks({ items }: { items: SidebarItem[] }) {
  return (
    <ul className="space-y-1">
      {items.map(({ to, label: text, icon: Icon, end, badge }) => (
        <li key={to}>
          <NavLink to={to} end={end} className={linkCls}>
            <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span className="flex-1">{text}</span>
            {badge ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-caption font-bold text-white">{badge}</span> : null}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function Sidebar({ items, label }: { items: SidebarItem[]; label: string }) {
  // Preserve the order router.tsx gave us; only collapse runs of the same group.
  const sections: Array<{ group?: string; items: SidebarItem[] }> = []
  for (const item of items) {
    const last = sections[sections.length - 1]
    if (last && last.group === item.group) last.items.push(item)
    else sections.push({ group: item.group, items: [item] })
  }
  return (
    <nav aria-label={label} className="space-y-6">
      {sections.map((section) =>
        section.group ? (
          <div key={section.group}>
            <h2 className="mb-1 px-3 text-caption font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{section.group}</h2>
            <SidebarLinks items={section.items} />
          </div>
        ) : (
          <SidebarLinks key={section.items[0].to} items={section.items} />
        ),
      )}
    </nav>
  )
}

/** Counsellor and Administration portal layout: sidebar on desktop, drawer on mobile/tablet (NFR-016). */
export function PortalLayout({ items, title, homeTo }: { items: SidebarItem[]; title: string; homeTo: string }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const open = useUi((s) => s.mobileNavOpen)
  const setOpen = useUi((s) => s.setMobileNav)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => setOpen(false), [pathname, setOpen])
  useEffect(() => {
    if (!open) return
    drawerRef.current?.querySelector<HTMLElement>('a')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <MaintenanceBanner />
      <header className="sticky top-0 z-30 h-(--header-h) border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex h-full min-w-0 items-center gap-2 px-4">
          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 lg:hidden dark:text-slate-200 dark:hover:bg-slate-800"
            aria-expanded={open}
            aria-controls="portal-nav"
            aria-label={open ? t('nav.closeMenu') : t('nav.menu')}
            onClick={() => setOpen(!open)}
          >
            {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
          </button>
          <Brand to={homeTo} subtitle={title} compactOnMobile />
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <LanguageSwitcher variant="dropdown" className="max-sm:hidden" />
            <ThemeToggle />
            <NotificationsMenu />
            <UserMenu />
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="scrollbar-thin sticky top-(--header-h) hidden h-[calc(100dvh-var(--header-h))] w-68 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3 pb-8 lg:block dark:border-slate-800 dark:bg-slate-900">
          <Sidebar items={items} label={t('nav.portalNav')} />
          <NavLink to="/" className="mt-8 flex min-h-11 items-center rounded-xl px-3 text-body-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            ← {t('nav.publicSite')}
          </NavLink>
        </aside>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" aria-label={t('nav.closeMenu')} className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} />
            <div id="portal-nav" ref={drawerRef} className="scrollbar-thin absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-x-hidden overflow-y-auto bg-white p-4 pb-8 shadow-xl dark:bg-slate-900">
              <Sidebar items={items} label={t('nav.portalNav')} />
              <LanguageSwitcher className="mt-6 md:hidden" />
            </div>
          </div>
        )}
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
