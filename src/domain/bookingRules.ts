import { addMinutes, differenceInMinutes, parseISO } from 'date-fns'
import type { Appointment, Counsellor, CounsellingLanguage, ID, Settings, Slot } from '../types'
import { generateSlots, isBookable, type CounsellorAvailability } from './slots'

/** Statuses that use up one of the client's sessions (late cancellations and no-shows count). */
export const COUNTS_TOWARDS_CAP: ReadonlySet<Appointment['status']> = new Set([
  'requested',
  'confirmed',
  'completed',
  'noShow',
  'lateCancelled',
])

export function sessionsUsed(appointments: readonly Appointment[], beneficiaryId: ID): number {
  return appointments.filter((a) => a.beneficiaryId === beneficiaryId && COUNTS_TOWARDS_CAP.has(a.status)).length
}

export type BookingCheck =
  | { ok: true; sessionNumber: number }
  | { ok: false; reason: 'sessionCap' | 'slotUnavailable' | 'tooLong' | 'inPast' }

/** Rules applied before any booking is accepted (pre-bid Q&A, FR-018, FR-023). */
export function checkBooking(
  appointments: readonly Appointment[],
  beneficiaryId: ID | undefined,
  slot: Slot,
  settings: Pick<Settings, 'maxSessionsPerClient' | 'maxSessionDurationMin'>,
  now: Date = new Date(),
): BookingCheck {
  if (parseISO(slot.start) <= now) return { ok: false, reason: 'inPast' }
  if (!isBookable(slot)) return { ok: false, reason: 'slotUnavailable' }
  if (slot.durationMin > settings.maxSessionDurationMin) return { ok: false, reason: 'tooLong' }
  const used = beneficiaryId ? sessionsUsed(appointments, beneficiaryId) : 0
  if (used >= settings.maxSessionsPerClient) return { ok: false, reason: 'sessionCap' }
  return { ok: true, sessionNumber: used + 1 }
}

export type CancellationDecision = 'ok' | 'late' | 'notAllowed'

/**
 * Cancelling with at least the notice period is a normal cancellation. Inside the
 * notice period the beneficiary may still cancel, but it is recorded as a late
 * cancellation and counts towards the session cap.
 */
export function cancellationDecision(
  apt: Appointment,
  noticeHours: number,
  now: Date = new Date(),
): CancellationDecision {
  if (apt.status !== 'requested' && apt.status !== 'confirmed') return 'notAllowed'
  const minutesUntil = differenceInMinutes(parseISO(apt.start), now)
  if (minutesUntil <= 0) return 'notAllowed'
  return minutesUntil >= noticeHours * 60 ? 'ok' : 'late'
}

/** Rescheduling is self-service only outside the notice period. */
export function canReschedule(apt: Appointment, noticeHours: number, now: Date = new Date()): boolean {
  return cancellationDecision(apt, noticeHours, now) === 'ok'
}

/** A confirmed appointment nobody joined within the no-show window (pre-bid: 10–15 min). */
export function isNoShow(apt: Appointment, noShowAfterMin: number, now: Date = new Date()): boolean {
  return apt.status === 'confirmed' && !apt.joinedAt && now >= addMinutes(parseISO(apt.start), noShowAfterMin)
}

/** The join button opens 10 minutes before the start and closes at the end. */
export function canJoin(apt: Appointment, now: Date = new Date()): boolean {
  if (apt.status !== 'confirmed') return false
  const start = parseISO(apt.start)
  return now >= addMinutes(start, -10) && now <= addMinutes(start, apt.durationMin)
}

export interface SearchFilters {
  districtId?: ID
  language?: CounsellingLanguage
  signLanguage?: boolean
}

export function matchesFilters(c: Counsellor, f: SearchFilters): boolean {
  if (!c.active) return false
  if (f.districtId && c.districtId !== f.districtId) return false
  if (f.language && !c.languages.includes(f.language)) return false
  if (f.signLanguage && !c.signLanguage) return false
  return true
}

export interface SlotOffer {
  counsellor: Counsellor
  slot: Slot
}

/** Earliest bookable slot for each counsellor, soonest first. */
export function earliestOffers(
  counsellors: readonly Counsellor[],
  availability: ReadonlyMap<ID, CounsellorAvailability>,
  appointments: readonly Appointment[],
  now: Date,
  days: number,
): SlotOffer[] {
  const offers: SlotOffer[] = []
  for (const c of counsellors) {
    const avail = availability.get(c.id)
    if (!avail) continue
    const slot = generateSlots(avail, appointments, now, days).find(isBookable)
    if (slot) offers.push({ counsellor: c, slot })
  }
  return offers.sort((a, b) => a.slot.start.localeCompare(b.slot.start))
}

export type FallbackResult =
  | { kind: 'local'; offers: SlotOffer[] }
  | { kind: 'remote'; offer: SlotOffer }
  | { kind: 'none' }

/**
 * No-slot routing rule from the pre-bid Q&A (FR-084):
 * 1. counsellors matching district + language with an open slot;
 * 2. otherwise the earliest remote slot with a counsellor in the same language, any district;
 * 3. otherwise nothing — the UI offers other languages (only on explicit confirmation)
 *    and a callback / waitlist. A different language is never auto-assigned.
 */
export function findWithFallback(
  counsellors: readonly Counsellor[],
  availability: ReadonlyMap<ID, CounsellorAvailability>,
  appointments: readonly Appointment[],
  filters: SearchFilters,
  now: Date,
  days = 21,
): FallbackResult {
  const local = earliestOffers(
    counsellors.filter((c) => matchesFilters(c, filters)),
    availability,
    appointments,
    now,
    days,
  )
  if (local.length) return { kind: 'local', offers: local }
  const remote = earliestOffers(
    counsellors.filter((c) => c.remoteAllowed && matchesFilters(c, { ...filters, districtId: undefined })),
    availability,
    appointments,
    now,
    days,
  )
  if (remote.length) return { kind: 'remote', offer: remote[0] }
  return { kind: 'none' }
}
