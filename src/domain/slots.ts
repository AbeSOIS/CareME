import { addDays, format, parseISO, set, startOfDay } from 'date-fns'
import type { Appointment, ID, Slot, SessionMode } from '../types'

/** One recurring weekly availability block published by a counsellor (FR-064). */
export interface AvailabilityPattern {
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number
  /** "HH:mm" local time. */
  time: string
  durationMin: number
  modes: SessionMode[]
}

export interface CounsellorAvailability {
  counsellorId: ID
  pattern: AvailabilityPattern[]
  /** Slot ids the counsellor has blocked out. */
  blocked: ID[]
  /** One-off slots added outside the weekly pattern. */
  extra: Slot[]
}

/** Appointment statuses that hold a slot. */
export const SLOT_HOLDING: ReadonlySet<Appointment['status']> = new Set(['requested', 'confirmed'])

export function slotId(counsellorId: ID, start: Date): ID {
  return `${counsellorId}@${format(start, "yyyy-MM-dd'T'HH:mm")}`
}

/**
 * Expand a counsellor's pattern into concrete slots for `days` days from `from`,
 * marking blocked and booked ones. Past slots are dropped.
 */
export function generateSlots(
  availability: CounsellorAvailability,
  appointments: readonly Appointment[],
  from: Date,
  days: number,
): Slot[] {
  const held = new Map<ID, ID>()
  for (const apt of appointments) {
    if (apt.counsellorId === availability.counsellorId && SLOT_HOLDING.has(apt.status)) held.set(apt.slotId, apt.id)
  }
  const blocked = new Set(availability.blocked)
  const slots: Slot[] = []
  const day0 = startOfDay(from)
  for (let d = 0; d < days; d++) {
    const day = addDays(day0, d)
    for (const p of availability.pattern) {
      if (p.weekday !== day.getDay()) continue
      const [h, m] = p.time.split(':').map(Number)
      const start = set(day, { hours: h, minutes: m, seconds: 0, milliseconds: 0 })
      if (start <= from) continue
      const id = slotId(availability.counsellorId, start)
      slots.push({
        id,
        counsellorId: availability.counsellorId,
        start: start.toISOString(),
        durationMin: p.durationMin,
        modes: p.modes,
        blocked: blocked.has(id),
        appointmentId: held.get(id),
      })
    }
  }
  const horizon = addDays(day0, days)
  const seen = new Set(slots.map((s) => s.id))
  for (const extra of availability.extra) {
    const start = parseISO(extra.start)
    if (start <= from || start >= horizon || seen.has(extra.id)) continue
    slots.push({ ...extra, blocked: blocked.has(extra.id), appointmentId: held.get(extra.id) })
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start))
}

export function isBookable(slot: Slot): boolean {
  return !slot.blocked && !slot.appointmentId
}
