import { describe, expect, it } from 'vitest'
import type { Alert } from '../types'
import { currentRosterEntry, dueEscalationLevel, escalationTarget, needsEscalation, secondsToAcknowledge, weekStartOf } from './alerts'

const alert: Alert = { id: 'al1', source: 'anonymous', raisedAt: '2026-10-08T08:00:00', escalations: [], status: 'open' }

describe('alerts', () => {
  it('escalates one level per unacknowledged period', () => {
    expect(needsEscalation(alert, 10, new Date('2026-10-08T08:09:59'))).toBe(false)
    expect(dueEscalationLevel(alert, 10, new Date('2026-10-08T08:10:00'))).toBe(1)
    expect(dueEscalationLevel(alert, 10, new Date('2026-10-08T08:25:00'))).toBe(2)
  })
  it('stops escalating once acknowledged', () => {
    const ack = { ...alert, acknowledgedAt: '2026-10-08T08:03:00', status: 'acknowledged' as const }
    expect(needsEscalation(ack, 10, new Date('2026-10-08T09:00:00'))).toBe(false)
    expect(secondsToAcknowledge(ack)).toBe(180)
  })
  it('clamps escalation targets to the end of the path', () => {
    expect(escalationTarget(['A', 'B'], 1)).toBe('A')
    expect(escalationTarget(['A', 'B'], 5)).toBe('B')
  })
  it('finds the officer for the current week (Monday start)', () => {
    expect(weekStartOf(new Date('2026-10-11T12:00:00'))).toBe('2026-10-05')
    const roster = [{ id: 'r', weekStart: '2026-10-05', officerUserId: 'u1' }]
    expect(currentRosterEntry(roster, new Date('2026-10-08T12:00:00'))?.officerUserId).toBe('u1')
    expect(currentRosterEntry(roster, new Date('2026-10-12T12:00:00'))).toBeUndefined()
  })
})
