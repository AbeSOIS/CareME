import { useMemo } from 'react'
import { parseISO } from 'date-fns'
import { LOCALE_TAG } from '../i18n'
import { useUi } from '../store/ui'

const TZ = 'Asia/Colombo'

/** Locale-aware date/time formatting in Sri Lanka time via Intl (covers si-LK and ta-LK). */
export function useFormat() {
  const lang = useUi((s) => s.language)
  return useMemo(() => {
    const tag = LOCALE_TAG[lang]
    const mk = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag, { timeZone: TZ, ...opts })
    const date = mk({ day: 'numeric', month: 'short', year: 'numeric' })
    const dateLong = mk({ weekday: 'long', day: 'numeric', month: 'long' })
    const dayShort = mk({ weekday: 'short', day: 'numeric', month: 'short' })
    const time = mk({ hour: 'numeric', minute: '2-digit' })
    const dateTime = mk({ day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    const month = mk({ month: 'short', year: 'numeric' })
    const num = new Intl.NumberFormat(tag)
    const rel = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' })
    const toDate = (v: string | Date) => (typeof v === 'string' ? parseISO(v) : v)
    return {
      date: (v: string | Date) => date.format(toDate(v)),
      dateLong: (v: string | Date) => dateLong.format(toDate(v)),
      dayShort: (v: string | Date) => dayShort.format(toDate(v)),
      time: (v: string | Date) => time.format(toDate(v)),
      dateTime: (v: string | Date) => dateTime.format(toDate(v)),
      month: (ym: string) => month.format(parseISO(`${ym}-01T12:00:00`)),
      number: (n: number) => num.format(n),
      /** "5 minutes ago", "in 2 hours". */
      relative: (v: string | Date, now: Date = new Date()) => {
        const diffSec = (toDate(v).getTime() - now.getTime()) / 1000
        const abs = Math.abs(diffSec)
        if (abs < 60) return rel.format(Math.round(diffSec), 'second')
        if (abs < 3600) return rel.format(Math.round(diffSec / 60), 'minute')
        if (abs < 86400) return rel.format(Math.round(diffSec / 3600), 'hour')
        return rel.format(Math.round(diffSec / 86400), 'day')
      },
      /** "4 min 20 s" style duration. */
      duration: (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = Math.floor(seconds % 60)
        return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${String(s).padStart(2, '0')}s`
      },
    }
  }, [lang])
}
