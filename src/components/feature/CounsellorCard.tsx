import { CalendarClock, Hand, MapPin, Wifi } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import type { Counsellor, Slot } from '../../types'
import { Badge, ButtonLink, cardSurface, cn } from '../ui'

export function CounsellorCard({ counsellor, nextSlot, bookLabel }: { counsellor: Counsellor; nextSlot?: Slot; bookLabel?: string }) {
  const { t } = useTranslation()
  const fmt = useFormat()
  const { districtName } = useLookups()
  return (
    <article className={cn(cardSurface, "flex h-full flex-col p-5")}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-h3 text-brand-900 dark:bg-brand-900 dark:text-brand-100">
          {counsellor.fullName
            .split(' ')
            .map((p) => p[0])
            .slice(0, 2)
            .join('')}
        </span>
        <div className="min-w-0">
          <h3 className="text-h3">{counsellor.fullName}</h3>
          <p className="flex items-center gap-1.5 text-body-sm text-slate-600 dark:text-slate-300">
            <MapPin aria-hidden className="size-4 shrink-0" /> {districtName(counsellor.districtId)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-body text-slate-700 dark:text-slate-200">{counsellor.bio}</p>
      {counsellor.qualifications.length > 0 && (
        <p className="mt-2 text-body-sm text-slate-600 dark:text-slate-300">{counsellor.qualifications.join(' · ')}</p>
      )}
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
      <div className="flex-1" />
      <p className="mt-4 flex items-center gap-2 text-body-sm">
        <CalendarClock aria-hidden className="size-4 shrink-0 text-brand-700 dark:text-brand-300" />
        <span>{nextSlot ? t('search.nextAvailable', { time: `${fmt.dayShort(nextSlot.start)}, ${fmt.time(nextSlot.start)}` }) : t('search.noAvailability')}</span>
      </p>
      <ButtonLink to={`/book/${counsellor.id}`} className="mt-4 w-full" aria-label={`${bookLabel ?? t('search.viewTimes')} — ${counsellor.fullName}`}>
        {bookLabel ?? t('search.viewTimes')}
      </ButtonLink>
    </article>
  )
}
