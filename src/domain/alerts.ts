import { addMinutes, differenceInSeconds, format, parseISO, startOfWeek } from 'date-fns'
import type { Alert, ID, ISODate, RosterEntry } from '../types'

/** Monday of the week containing `date`, as "YYYY-MM-DD". */
export function weekStartOf(date: Date): ISODate {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

/** The Emergency Officer designation in force at `now` (FR-052/053). */
export function currentRosterEntry(roster: readonly RosterEntry[], now: Date = new Date()): RosterEntry | undefined {
  const week = weekStartOf(now)
  return roster.find((r) => r.weekStart === week)
}

export function isOpen(alert: Alert): boolean {
  return alert.status !== 'closed'
}

/**
 * An alert escalates one level each time a full escalation period passes without
 * acknowledgement (FR-055). Returns the level the alert should now be at.
 */
export function dueEscalationLevel(alert: Alert, periodMin: number, now: Date = new Date()): number {
  if (alert.acknowledgedAt || alert.status === 'closed') return alert.escalations.length
  const elapsedMin = differenceInSeconds(now, parseISO(alert.raisedAt)) / 60
  return Math.max(alert.escalations.length, Math.floor(elapsedMin / periodMin))
}

export function needsEscalation(alert: Alert, periodMin: number, now: Date = new Date()): boolean {
  return dueEscalationLevel(alert, periodMin, now) > alert.escalations.length
}

/** When the next automatic escalation will fire, or null if acknowledged/closed. */
export function nextEscalationAt(alert: Alert, periodMin: number): Date | null {
  if (alert.acknowledgedAt || alert.status === 'closed') return null
  return addMinutes(parseISO(alert.raisedAt), periodMin * (alert.escalations.length + 1))
}

/** Escalation target for a level (1-based), clamped to the last step of the path. */
export function escalationTarget(path: readonly string[], level: number): string {
  if (!path.length) return 'Ministry Administrator'
  return path[Math.min(level, path.length) - 1]
}

/** Seconds between raising and acknowledgement, for REP-005. */
export function secondsToAcknowledge(alert: Alert): number | null {
  if (!alert.acknowledgedAt) return null
  return differenceInSeconds(parseISO(alert.acknowledgedAt), parseISO(alert.raisedAt))
}

/** Open alerts the incoming officer must be shown at handover (FR-058). */
export function openAlertIds(alerts: readonly Alert[]): ID[] {
  return alerts.filter(isOpen).map((a) => a.id)
}
