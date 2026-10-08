import { CalendarClock, Hand, MapPin, Wifi } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import type { Counsellor, Slot } from '../../types'
import { Badge, ButtonLink } from '../ui'

export function CounsellorCard({ counsellor, nextSlot, bookLabel }: { counsellor: Counsellor; nextSlot?: Slot; bookLabel?: string }) {
  const { t } = useTranslation()
  const fmt = useFormat()
  const { districtName } = useLookups()
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span aria-hidden className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-900 dark:bg-brand-900 dark:text-brand-100">
          {counsellor.fullName
            .split(' ')
            .map((p) => p[0])
            .slice(0, 2)
            .join('')}
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{counsellor.fullName}</h3>
          <p className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
            <MapPin aria-hidden className="size-4" /> {districtName(counsellor.districtId)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{counsellor.bio}</p>
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t('search.languages')}>
        {counsellor.languages.map((l) => (
          <Badge key={l} tone={l === 'sign' ? 'info' : 'brand'}>
            {l === 'sign' && <Hand aria-hidden className="size-3" />}
            {t(`lang.${l}`)}
          </Badge>
        ))}
        {counsellor.remoteAllowed && (
          <Badge>
            <Wifi aria-hidden className="size-3" />
            {t('search.remote')}
          </Badge>
        )}
      </div>
      <p className="mt-4 flex flex-1 items-end gap-2 text-sm">
        <CalendarClock aria-hidden className="size-4 shrink-0" />
        {nextSlot ? t('search.nextAvailable', { time: `${fmt.dayShort(nextSlot.start)}, ${fmt.time(nextSlot.start)}` }) : t('search.noAvailability')}
      </p>
      <ButtonLink to={`/book/${counsellor.id}`} className="mt-4" aria-label={`${bookLabel ?? t('search.viewTimes')} — ${counsellor.fullName}`}>
        {bookLabel ?? t('search.viewTimes')}
      </ButtonLink>
    </article>
  )
}
