import { describe, expect, it } from 'vitest'
import type { Appointment, Counsellor, Slot } from '../types'
import { canJoin, cancellationDecision, checkBooking, findWithFallback, isNoShow, sessionsUsed } from './bookingRules'
import type { CounsellorAvailability } from './slots'

const now = new Date('2026-10-08T08:00:00')
const settings = { maxSessionsPerClient: 8, maxSessionDurationMin: 60 }

function apt(over: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    beneficiaryId: 'b1',
    counsellorId: 'c1',
    slotId: 's1',
    start: '2026-10-10T09:00:00',
    durationMin: 60,
    mode: 'video',
    language: 'si',
    status: 'confirmed',
    sessionNumber: 1,
    history: [],
    createdAt: '2026-10-01T00:00:00',
    ...over,
  }
}

const slot: Slot = { id: 's9', counsellorId: 'c1', start: '2026-10-12T09:00:00', durationMin: 60, modes: ['video'], blocked: false }

describe('session cap', () => {
  it('counts late cancellations and no-shows but not normal cancellations', () => {
    const list = [
      apt({ id: '1', status: 'completed' }),
      apt({ id: '2', status: 'noShow' }),
      apt({ id: '3', status: 'lateCancelled' }),
      apt({ id: '4', status: 'cancelled' }),
      apt({ id: '5', status: 'rejected' }),
    ]
    expect(sessionsUsed(list, 'b1')).toBe(3)
  })

  it('rejects a 9th session', () => {
    const eight = Array.from({ length: 8 }, (_, i) => apt({ id: `x${i}`, status: 'completed' }))
    expect(checkBooking(eight, 'b1', slot, settings, now)).toEqual({ ok: false, reason: 'sessionCap' })
    expect(checkBooking(eight.slice(1), 'b1', slot, settings, now)).toEqual({ ok: true, sessionNumber: 8 })
  })

  it('rejects booked, blocked, past and over-long slots', () => {
    expect(checkBooking([], 'b1', { ...slot, appointmentId: 'z' }, settings, now)).toMatchObject({ reason: 'slotUnavailable' })
    expect(checkBooking([], 'b1', { ...slot, blocked: true }, settings, now)).toMatchObject({ reason: 'slotUnavailable' })
    expect(checkBooking([], 'b1', { ...slot, start: '2026-10-01T09:00:00' }, settings, now)).toMatchObject({ reason: 'inPast' })
    expect(checkBooking([], 'b1', { ...slot, durationMin: 90 }, settings, now)).toMatchObject({ reason: 'tooLong' })
  })
})

describe('cancellation notice', () => {
  it('is a normal cancellation outside 24 hours', () => {
    expect(cancellationDecision(apt({ start: '2026-10-09T08:00:00' }), 24, now)).toBe('ok')
  })
  it('is a late cancellation inside 24 hours', () => {
    expect(cancellationDecision(apt({ start: '2026-10-09T07:59:00' }), 24, now)).toBe('late')
  })
  it('cannot cancel after the start or when already closed', () => {
    expect(cancellationDecision(apt({ start: '2026-10-08T07:00:00' }), 24, now)).toBe('notAllowed')
    expect(cancellationDecision(apt({ status: 'completed' }), 24, now)).toBe('notAllowed')
  })
})

describe('no-show and joining', () => {
  const started = apt({ start: '2026-10-08T07:45:00' })
  it('marks no-show 15 minutes after the start without a join', () => {
    expect(isNoShow(started, 15, now)).toBe(true)
    expect(isNoShow({ ...started, joinedAt: '2026-10-08T07:50:00' }, 15, now)).toBe(false)
    expect(isNoShow(apt({ start: '2026-10-08T07:50:00' }), 15, now)).toBe(false)
  })
  it('opens the join window 10 minutes early', () => {
    expect(canJoin(apt({ start: '2026-10-08T08:10:00' }), now)).toBe(true)
    expect(canJoin(apt({ start: '2026-10-08T08:11:00' }), now)).toBe(false)
  })
})

describe('no-slot fallback', () => {
  const base: Omit<Counsellor, 'id' | 'districtId' | 'languages' | 'remoteAllowed'> = {
    fullName: 'X',
    gender: 'female',
    signLanguage: false,
    active: true,
    bio: '',
    qualifications: [],
  }
  const counsellors: Counsellor[] = [
    { ...base, id: 'local-si', districtId: 'kalutara', languages: ['si'], remoteAllowed: false },
    { ...base, id: 'remote-ta', districtId: 'jaffna', languages: ['ta'], remoteAllowed: true },
    { ...base, id: 'local-ta-noremote', districtId: 'batticaloa', languages: ['ta'], remoteAllowed: false },
  ]
  const pattern = [{ weekday: 5, time: '09:00', durationMin: 60, modes: ['video' as const] }]
  const availability = new Map<string, CounsellorAvailability>(
    counsellors.map((c) => [c.id, { counsellorId: c.id, pattern, blocked: [], extra: [] }]),
  )

  it('returns local matches first', () => {
    const r = findWithFallback(counsellors, availability, [], { districtId: 'kalutara', language: 'si' }, now)
    expect(r.kind).toBe('local')
  })
  it('falls back to the earliest remote counsellor in the same language', () => {
    const r = findWithFallback(counsellors, availability, [], { districtId: 'kalutara', language: 'ta' }, now)
    expect(r.kind === 'remote' && r.offer.counsellor.id).toBe('remote-ta')
  })
  it('never switches language automatically', () => {
    const r = findWithFallback(counsellors, availability, [], { districtId: 'kalutara', language: 'en' }, now)
    expect(r.kind).toBe('none')
  })
})
