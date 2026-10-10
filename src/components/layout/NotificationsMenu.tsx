import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useFormat } from '../../hooks/useFormat'
import { notificationsApi } from '../../services/api'
import { useAuth } from '../../store/auth'
import type { Notification } from '../../types'

/** Header bell. Text is always minimal-content (FR-063): no names, no clinical detail. */
export function NotificationsMenu() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const session = useAuth((s) => s.session)
  const [items, setItems] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!session) return
    let alive = true
    const load = () => notificationsApi.list().then((list) => alive && setItems(list)).catch(() => undefined)
    void load()
    const id = setInterval(load, 20_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [session])

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

  if (!session) return null
  const unread = items.filter((n) => !n.readAt).length

  const markAll = async () => {
    await notificationsApi.readAll()
    setItems((list) => list.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        aria-label={`${t('common.notifications')}${unread ? ` — ${t('common.unread', { count: unread })}` : ''}`}
        className="relative inline-flex size-11 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Bell aria-hidden className="size-5" />
        {unread > 0 && (
          <span aria-hidden className="absolute -top-0.5 -right-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-caption font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 flex max-h-[min(28rem,80vh)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white whitespace-normal shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-body font-semibold">{t('common.notifications')}</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="min-h-11 shrink-0 rounded-lg text-body-sm font-medium whitespace-nowrap text-brand-800 hover:underline dark:text-brand-200">
                {t('common.markAllRead')}
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-body-sm text-slate-600 dark:text-slate-300">{t('common.noNotifications')}</p>
          ) : (
            <ul className="scrollbar-thin flex-1 divide-y divide-slate-100 overflow-x-hidden overflow-y-auto dark:divide-slate-800">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.link ?? '#'}
                    onClick={() => {
                      setOpen(false)
                      if (!n.readAt) void notificationsApi.read(n.id)
                    }}
                    className="flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-brand-600'}`} />
                    <span className="min-w-0 flex-1 whitespace-normal text-body-sm">
                      <span className="block [overflow-wrap:anywhere]">{t(n.messageKey, n.params)}</span>
                      <span className="text-caption text-slate-500 dark:text-slate-300">{fmt.relative(n.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
