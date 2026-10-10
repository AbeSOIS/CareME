import { useEffect, useRef, useState } from 'react'
import { differenceInSeconds, parseISO } from 'date-fns'
import { CircleOff, MessageSquare, Mic, MicOff, PhoneOff, Siren, Video, VideoOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Callout, Modal, Spinner, TextArea, cn } from '../../components/ui'
import { canJoin } from '../../domain/bookingRules'
import { useApiError } from '../../hooks/useApiError'
import { useFormat } from '../../hooks/useFormat'
import { alertsApi, bookingApi, counsellorApi } from '../../services/api'
import { useAuth } from '../../store/auth'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import type { AppointmentView } from '../../types'

/**
 * Session room SHELL (no WebRTC, no media capture, never recorded — NFR-013).
 * Enforces the configured maximum duration with a visible timer.
 */
export function SessionRoomPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const { id } = useParams()
  const navigate = useNavigate()
  const apiError = useApiError()
  const toast = useUi((s) => s.toast)
  const isCounsellor = useAuth((s) => s.session?.effectiveRoles.includes('counsellor') ?? false)
  const maxMin = useSettings((s) => s.settings.maxSessionDurationMin)
  const [apt, setApt] = useState<AppointmentView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [camera, setCamera] = useState(true)
  const [mic, setMic] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ from: 'me'; text: string; at: Date }>>([])
  const [draft, setDraft] = useState('')
  const [riskOpen, setRiskOpen] = useState(false)
  const [riskNote, setRiskNote] = useState('')
  const [joinedAt] = useState(() => new Date())
  const [elapsed, setElapsed] = useState(0)
  const announced = useRef(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const a = await bookingApi.get(id!)
        if (!canJoin(a)) {
          if (alive) setError(t('session.notJoinable'))
          return
        }
        const joined = await bookingApi.join(a.id)
        if (alive) setApt(joined)
      } catch (e) {
        if (alive) setError(apiError.message(e))
      }
    })()
    return () => {
      alive = false
    }
  }, [id, t, apiError])

  useEffect(() => {
    if (!apt) return
    const tick = () => setElapsed(differenceInSeconds(new Date(), joinedAt))
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [apt, joinedAt])

  const limitSec = Math.min(apt?.durationMin ?? maxMin, maxMin) * 60
  const remainingMin = Math.max(0, Math.ceil((limitSec - elapsed) / 60))
  const ended = apt ? elapsed >= limitSec : false
  useEffect(() => {
    if (apt && remainingMin <= 5 && !announced.current && !ended) {
      announced.current = true
      toast(t('session.endingSoon', { minutes: remainingMin }), 'info')
    }
  }, [apt, remainingMin, ended, t, toast])

  const leave = async () => {
    if (isCounsellor && apt) {
      try {
        if (parseISO(apt.start) <= new Date()) await counsellorApi.complete(apt.id)
      } catch {
        // already completed or not yet started
      }
      navigate(apt.caseId ? `/counsellor/cases/${apt.caseId}?tab=notes` : '/counsellor/appointments')
    } else navigate('/me/appointments')
  }

  if (error)
    return (
      <div className="mx-auto max-w-lg p-6">
        <Callout tone="warning" title={t('session.title')}>
          {error}
        </Callout>
        <Link to={isCounsellor ? '/counsellor/appointments' : '/me/appointments'} className="mt-4 inline-block font-semibold text-brand-800 hover:underline dark:text-brand-200">
          ← {t('common.back')}
        </Link>
      </div>
    )
  if (!apt) return <Spinner label={t('common.loading')} />

  const other = isCounsellor ? (apt.clientName ?? t('session.client')) : apt.counsellorName
  const ctrl = 'inline-flex size-13 flex-col items-center justify-center rounded-full text-white transition-colors duration-150 focus-visible:outline-white'
  const ctrlLabel = 'text-caption text-slate-300'

  return (
    <div className="flex min-h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-3">
        <h1 className="text-h3">{t('session.title')}</h1>
        <Badge tone="success">
          <CircleOff aria-hidden className="size-3" />
          {t('session.notRecorded')}
        </Badge>
        <div className="ml-auto flex items-center gap-3 text-body-sm" aria-live="off">
          <span>
            {t('session.elapsed')}: <span className="font-mono">{fmt.duration(elapsed)}</span>
          </span>
          <Badge tone={remainingMin <= 5 ? 'warning' : 'neutral'}>{t('session.remaining', { minutes: remainingMin })}</Badge>
        </div>
      </header>

      <main id="main" className="relative flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        <section className="relative flex min-h-[50dvh] flex-1 items-center justify-center rounded-2xl bg-slate-900" aria-label={other}>
          <div className="text-center">
            <span className="mx-auto inline-flex size-24 items-center justify-center rounded-full bg-brand-800 text-3xl font-bold">{other.slice(0, 1)}</span>
            <p className="mt-3 text-h3">{other}</p>
            <p className="text-body text-slate-300">{t('session.waiting')}</p>
            <p className="mt-6 max-w-sm text-body-sm text-slate-300">{t('session.placeholder')}</p>
          </div>
          <div className="absolute right-4 bottom-4 flex h-28 w-40 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-body-sm">
            {camera ? t('session.you') : <VideoOff aria-hidden className="size-6 text-slate-300" />}
          </div>
          {ended && (
            <div role="alert" className="absolute inset-x-4 top-4 rounded-xl bg-amber-500 p-3 font-semibold text-slate-950">
              {t('session.ended')}
            </div>
          )}
        </section>

        {chatOpen && (
          <aside className="flex w-full flex-col rounded-2xl bg-slate-900 p-4 lg:w-80" aria-label={t('session.chat')}>
            <h2 className="font-semibold">{t('session.chat')}</h2>
            <p className="text-caption text-slate-300">{t('session.chatNote')}</p>
            <ul className="mt-3 flex-1 space-y-2 overflow-y-auto" aria-live="polite">
              {messages.map((m, i) => (
                <li key={i} className="ml-auto max-w-[85%] rounded-2xl bg-brand-700 px-3 py-2 text-body">
                  {m.text}
                  <span className="mt-1 block text-right text-caption text-brand-100">{fmt.time(m.at)}</span>
                </li>
              ))}
            </ul>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!draft.trim()) return
                setMessages((m) => [...m, { from: 'me', text: draft.trim(), at: new Date() }])
                setDraft('')
              }}
            >
              <label className="sr-only" htmlFor="chat-input">
                {t('session.chatPlaceholder')}
              </label>
              <input
                id="chat-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('session.chatPlaceholder')}
                className="min-h-12 flex-1 rounded-xl border border-slate-600 bg-slate-950 px-3 text-body text-slate-100 placeholder:text-slate-400"
              />
              <Button type="submit" size="sm">
                {t('session.send')}
              </Button>
            </form>
          </aside>
        )}
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-800 px-4 py-4">
        <span className="flex flex-col items-center gap-1">
          <button type="button" aria-pressed={!mic} onClick={() => setMic((m) => !m)} className={cn(ctrl, mic ? 'bg-slate-700 hover:bg-slate-600' : 'bg-amber-600')} aria-label={mic ? t('session.micOff') : t('session.micOn')}>
            {mic ? <Mic aria-hidden className="size-6" /> : <MicOff aria-hidden className="size-6" />}
          </button>
          <span aria-hidden className={ctrlLabel}>{t('session.micLabel')}</span>
        </span>
        <span className="flex flex-col items-center gap-1">
          <button type="button" aria-pressed={!camera} onClick={() => setCamera((c) => !c)} className={cn(ctrl, camera ? 'bg-slate-700 hover:bg-slate-600' : 'bg-amber-600')} aria-label={camera ? t('session.cameraOff') : t('session.cameraOn')}>
            {camera ? <Video aria-hidden className="size-6" /> : <VideoOff aria-hidden className="size-6" />}
          </button>
          <span aria-hidden className={ctrlLabel}>{t('session.cameraLabel')}</span>
        </span>
        <span className="flex flex-col items-center gap-1">
          <button type="button" aria-pressed={chatOpen} onClick={() => setChatOpen((c) => !c)} className={cn(ctrl, chatOpen ? 'bg-brand-600' : 'bg-slate-700 hover:bg-slate-600')} aria-label={t('session.chat')}>
            <MessageSquare aria-hidden className="size-6" />
          </button>
          <span aria-hidden className={ctrlLabel}>{t('session.chatLabel')}</span>
        </span>
        {isCounsellor ? (
          <Button variant="secondary" onClick={() => setRiskOpen(true)} icon={<Siren aria-hidden className="size-5 text-red-600" />}>
            {t('session.riskAlert')}
          </Button>
        ) : (
          <Link to="/emergency" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-red-600 px-5 font-bold text-white hover:bg-red-700">
            <Siren aria-hidden className="size-5" />
            {t('emergency.button')}
          </Link>
        )}
        <span className="flex flex-col items-center gap-1">
          <button type="button" onClick={leave} className={cn(ctrl, 'w-auto bg-red-700 px-6 hover:bg-red-800')} aria-label={isCounsellor ? t('session.endForAll') : t('session.end')}>
            <PhoneOff aria-hidden className="size-6" />
          </button>
          <span aria-hidden className={ctrlLabel}>{t('session.leaveLabel')}</span>
        </span>
      </footer>

      <Modal
        open={riskOpen}
        onClose={() => setRiskOpen(false)}
        title={t('case.riskTitle')}
        description={t('case.riskLead')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRiskOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await alertsApi.raise({ beneficiaryId: apt.beneficiaryId, message: riskNote })
                  toast(t('case.riskSent'), 'success')
                  setRiskOpen(false)
                  setRiskNote('')
                } catch (e) {
                  apiError.show(e)
                }
              }}
            >
              {t('case.riskAlert')}
            </Button>
          </>
        }
      >
        <TextArea label={t('case.riskNote')} value={riskNote} onChange={(e) => setRiskNote(e.target.value)} />
      </Modal>
    </div>
  )
}
