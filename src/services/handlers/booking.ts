import { parseISO } from 'date-fns'
import { isMinor } from '../../domain/age'
import {
  canReschedule,
  cancellationDecision,
  checkBooking,
  findWithFallback,
  isNoShow,
  matchesFilters,
  type SearchFilters,
} from '../../domain/bookingRules'
import { newId } from '../../domain/ids'
import { generateSlots, isBookable, type CounsellorAvailability } from '../../domain/slots'
import type {
  Appointment,
  AppointmentEvent,
  AppointmentView,
  Beneficiary,
  CounsellingLanguage,
  CounsellorSummary,
  Gender,
  GuardianConsent,
  ID,
  SearchResult,
  SelfAssessmentResult,
  SessionMode,
  Slot,
  WaitlistRequest,
} from '../../types'
import { ApiError, type RequestContext, type Router } from '../router'
import { db } from '../storage'
import { createBeneficiary, createGuestSession } from './auth'
import { audit, findOr404, notify, replaceById, requireRole, requireUser } from './context'

const SEARCH_DAYS = 21

function availabilityMap(): Map<ID, CounsellorAvailability> {
  return new Map(db.get('availability').map((a) => [a.counsellorId, a]))
}

export function slotsFor(counsellorId: ID, days = SEARCH_DAYS): Slot[] {
  const avail = db.get('availability').find((a) => a.counsellorId === counsellorId)
  if (!avail) return []
  return generateSlots(avail, db.get('appointments'), new Date(), days)
}

function findSlot(counsellorId: ID, slotId: ID): Slot {
  const slot = slotsFor(counsellorId).find((s) => s.id === slotId)
  if (!slot) throw new ApiError(409, 'slotUnavailable')
  return slot
}

/** Record no-shows lazily whenever appointments are read (FR-023). */
export function sweepNoShows(): void {
  const { noShowAfterMin } = db.get('settings')
  const now = new Date()
  let changed = false
  const next = db.get('appointments').map((a) => {
    if (!isNoShow(a, noShowAfterMin, now)) return a
    changed = true
    return { ...a, status: 'noShow' as const, history: [...a.history, { at: now.toISOString(), type: 'noShow' as const }] }
  })
  if (changed) db.set('appointments', next)
}

export function toView(a: Appointment, staff: boolean): AppointmentView {
  const counsellor = db.get('counsellors').find((c) => c.id === a.counsellorId)
  const view: AppointmentView = { ...a, counsellorName: counsellor?.fullName ?? '—' }
  if (staff) {
    const b = db.get('beneficiaries').find((x) => x.id === a.beneficiaryId)
    view.clientCode = b?.clientCode
    view.clientName = b?.preferredName ?? b?.fullName
    view.caseId = db.get('cases').find((c) => c.beneficiaryId === a.beneficiaryId)?.id
  }
  return view
}

export function pushEvent(a: Appointment, event: Omit<AppointmentEvent, 'at'>, patch: Partial<Appointment> = {}): Appointment {
  const updated: Appointment = { ...a, ...patch, history: [...a.history, { ...event, at: new Date().toISOString() }] }
  db.update('appointments', (list) => replaceById(list, updated))
  return updated
}

function ownAppointment(ctx: RequestContext, id: ID): Appointment {
  const user = requireUser(ctx)
  const apt = findOr404(db.get('appointments'), id)
  const isClient = user.beneficiaryId === apt.beneficiaryId
  const isCounsellor = user.counsellorId === apt.counsellorId
  if (!isClient && !isCounsellor) throw new ApiError(403, 'forbidden')
  return apt
}

/** Ensure the beneficiary has a case record with this counsellor (created on first booking). */
function ensureCase(beneficiaryId: ID, counsellorId: ID): void {
  if (db.get('cases').some((c) => c.beneficiaryId === beneficiaryId)) return
  const now = new Date().toISOString()
  db.update('cases', (list) => [
    ...list,
    { id: newId('case'), beneficiaryId, counsellorId, openedAt: now, status: 'open', assessments: [], notes: [], followUps: [], updatedAt: now },
  ])
}

interface BookBody {
  counsellorId: ID
  slotId: ID
  mode: SessionMode
  language: CounsellingLanguage
  details?: {
    fullName: string
    phone: string
    email?: string
    dateOfBirth?: string
    gender?: Gender
    districtId?: string
  }
  consent: boolean
  guardian?: Omit<GuardianConsent, 'id' | 'recordedAt'>
  userAgent?: string
}

export function registerBooking(r: Router): void {
  r.on('get', '/counsellors', ({ query }) => {
    const filters: SearchFilters = {
      districtId: query.districtId || undefined,
      language: (query.language as CounsellingLanguage) || undefined,
      signLanguage: query.signLanguage === 'true',
    }
    const appointments = db.get('appointments')
    const avail = availabilityMap()
    const now = new Date()
    const list: CounsellorSummary[] = db
      .get('counsellors')
      .filter((c) => matchesFilters(c, filters))
      .map((c) => {
        const a = avail.get(c.id)
        const nextSlot = a ? generateSlots(a, appointments, now, SEARCH_DAYS).find(isBookable) : undefined
        return { ...c, nextSlot }
      })
      .sort((a, b) => (a.nextSlot?.start ?? '9').localeCompare(b.nextSlot?.start ?? '9'))
    return list
  })

  r.on('get', '/counsellors/search', ({ query }): SearchResult => {
    const filters: SearchFilters = {
      districtId: query.districtId || undefined,
      language: (query.language as CounsellingLanguage) || undefined,
      signLanguage: query.signLanguage === 'true',
    }
    return findWithFallback(db.get('counsellors'), availabilityMap(), db.get('appointments'), filters, new Date(), SEARCH_DAYS)
  })

  r.on('get', '/counsellors/:id', ({ params }) => {
    const counsellor = findOr404(db.get('counsellors'), params.id)
    if (!counsellor.active) throw new ApiError(404, 'notFound')
    return { counsellor, slots: slotsFor(counsellor.id).filter(isBookable) }
  })

  r.on('post', '/appointments', ({ body, ctx }) => {
    const b = body as BookBody
    const settings = db.get('settings')
    const counsellor = findOr404(db.get('counsellors'), b.counsellorId)
    if (!counsellor.active) throw new ApiError(409, 'slotUnavailable')
    // Never book a language the counsellor does not offer (pre-bid fallback rule).
    if (!counsellor.languages.includes(b.language)) throw new ApiError(422, 'languageMismatch')
    const slot = findSlot(b.counsellorId, b.slotId)
    if (!slot.modes.includes(b.mode)) throw new ApiError(422, 'modeUnavailable')
    if (!b.consent) throw new ApiError(422, 'consentRequired')

    let beneficiary: Beneficiary | undefined = ctx.user?.beneficiaryId
      ? db.get('beneficiaries').find((x) => x.id === ctx.user!.beneficiaryId)
      : undefined
    if (ctx.user && !ctx.user.roles.includes('beneficiary')) throw new ApiError(403, 'staffCannotBook')

    const dob = beneficiary?.dateOfBirth ?? b.details?.dateOfBirth
    const guardianOnFile = beneficiary?.guardianConsent?.consentGiven
    if (isMinor(dob, settings.minorAgeThreshold) && !guardianOnFile && !b.guardian?.consentGiven) {
      throw new ApiError(422, 'minorConsentRequired')
    }

    const check = checkBooking(db.get('appointments'), beneficiary?.id, slot, settings)
    if (!check.ok) throw new ApiError(409, check.reason)

    let session
    if (!beneficiary) {
      if (!b.details?.fullName || !b.details.phone) throw new ApiError(422, 'detailsRequired')
      // FR-010: personal details are collected only now, at booking.
      beneficiary = createBeneficiary({
        ...b.details,
        preferredLanguage: b.language === 'sign' ? 'si' : b.language,
        counsellingLanguage: b.language,
      })
      session = createGuestSession(beneficiary, ctx, b.userAgent ?? 'Unknown')
    }

    const now = new Date().toISOString()
    const patch: Partial<Beneficiary> = {
      consents: [
        ...beneficiary.consents,
        { id: newId('cons'), purpose: 'counselling', givenAt: now, wordingVersion: 'draft-0.1' },
      ],
    }
    if (b.guardian?.consentGiven) patch.guardianConsent = { ...b.guardian, id: newId('gc'), recordedAt: now }
    beneficiary = { ...beneficiary, ...patch }
    db.update('beneficiaries', (list) => replaceById(list, beneficiary!))

    const apt: Appointment = {
      id: newId('apt'),
      beneficiaryId: beneficiary.id,
      counsellorId: counsellor.id,
      slotId: slot.id,
      start: slot.start,
      durationMin: slot.durationMin,
      mode: b.mode,
      language: b.language,
      status: 'requested',
      sessionNumber: check.sessionNumber,
      history: [{ at: now, type: 'requested', byUserId: session?.user.id ?? ctx.user?.id }],
      createdAt: now,
    }
    db.update('appointments', (list) => [...list, apt])
    ensureCase(beneficiary.id, counsellor.id)
    const counsellorUser = db.get('users').find((u) => u.counsellorId === counsellor.id)
    if (counsellorUser) notify({ recipientUserId: counsellorUser.id, messageKey: 'notif.newRequest', link: '/counsellor/appointments' })
    audit('record.create', session ? { roles: ['beneficiary'], user: session.user } : ctx, `appointment:${apt.id}`)
    return { appointment: toView(apt, false), session }
  })

  r.on('get', '/appointments/mine', ({ ctx }) => {
    const user = requireRole(ctx, 'beneficiary')
    sweepNoShows()
    return db
      .get('appointments')
      .filter((a) => a.beneficiaryId === user.beneficiaryId)
      .sort((a, b) => b.start.localeCompare(a.start))
      .map((a) => toView(a, false))
  })

  r.on('get', '/appointments/:id', ({ ctx, params }) => {
    const apt = ownAppointment(ctx, params.id)
    return toView(apt, ctx.roles.includes('counsellor'))
  })

  r.on('post', '/appointments/:id/cancel', ({ ctx, params, body }) => {
    const apt = ownAppointment(ctx, params.id)
    const { noticeHours, confirmLate, reason } = {
      noticeHours: db.get('settings').cancellationNoticeHours,
      ...(body as { confirmLate?: boolean; reason?: string }),
    }
    const byCounsellor = ctx.user?.counsellorId === apt.counsellorId
    const decision = cancellationDecision(apt, noticeHours)
    if (decision === 'notAllowed') throw new ApiError(409, 'cannotCancel')
    // Counsellor-initiated cancellations never penalise the client.
    const late = decision === 'late' && !byCounsellor
    if (late && !confirmLate) throw new ApiError(409, 'lateCancellation', { noticeHours })
    const updated = pushEvent(apt, { type: 'cancelled', byUserId: ctx.user?.id, note: reason }, { status: late ? 'lateCancelled' : 'cancelled' })
    const notifyUser = byCounsellor
      ? db.get('users').find((u) => u.beneficiaryId === apt.beneficiaryId)
      : db.get('users').find((u) => u.counsellorId === apt.counsellorId)
    if (notifyUser) notify({ recipientUserId: notifyUser.id, messageKey: 'notif.appointmentChanged', link: byCounsellor ? '/me/appointments' : '/counsellor/appointments' })
    audit('record.update', ctx, `appointment:${apt.id}`, late ? 'Late cancellation' : 'Cancelled')
    return toView(updated, byCounsellor)
  })

  r.on('post', '/appointments/:id/reschedule', ({ ctx, params, body }) => {
    const apt = ownAppointment(ctx, params.id)
    const settings = db.get('settings')
    if (!canReschedule(apt, settings.cancellationNoticeHours)) throw new ApiError(409, 'cannotReschedule', { noticeHours: settings.cancellationNoticeHours })
    const slot = findSlot(apt.counsellorId, (body as { slotId: ID }).slotId)
    if (!isBookable(slot) || parseISO(slot.start) <= new Date()) throw new ApiError(409, 'slotUnavailable')
    const updated = pushEvent(
      apt,
      { type: 'rescheduled', byUserId: ctx.user?.id, note: `${apt.start} → ${slot.start}` },
      { slotId: slot.id, start: slot.start, durationMin: slot.durationMin, status: 'requested' },
    )
    const counsellorUser = db.get('users').find((u) => u.counsellorId === apt.counsellorId)
    if (counsellorUser) notify({ recipientUserId: counsellorUser.id, messageKey: 'notif.appointmentChanged', link: '/counsellor/appointments' })
    audit('record.update', ctx, `appointment:${apt.id}`, 'Rescheduled')
    return toView(updated, false)
  })

  r.on('post', '/appointments/:id/join', ({ ctx, params }) => {
    const apt = ownAppointment(ctx, params.id)
    if (apt.status !== 'confirmed') throw new ApiError(409, 'notJoinable')
    const updated = pushEvent(apt, { type: 'joined', byUserId: ctx.user?.id }, { joinedAt: apt.joinedAt ?? new Date().toISOString() })
    return toView(updated, ctx.roles.includes('counsellor'))
  })

  r.on('post', '/waitlist', ({ ctx, body }) => {
    const data = body as Omit<WaitlistRequest, 'id' | 'status' | 'createdAt'>
    if (!data.contactPhone) throw new ApiError(422, 'detailsRequired')
    const req: WaitlistRequest = {
      ...data,
      beneficiaryId: ctx.user?.beneficiaryId,
      id: newId('wl'),
      status: 'open',
      createdAt: new Date().toISOString(),
    }
    db.update('waitlist', (list) => [...list, req])
    notify({ recipientRole: 'admin', messageKey: 'notif.waitlist', link: '/admin/waitlist' })
    audit('record.create', ctx, `waitlist:${req.id}`, req.kind)
    return req
  })

  /** Minor without safe / available caregiver support (Annex 6 Part C placeholder): notify the safeguarding contact. */
  r.on('post', '/safeguarding', ({ ctx, body }) => {
    const { contactPhone } = body as { contactPhone?: string }
    notify({ recipientRole: 'admin', messageKey: 'notif.safeguarding', params: contactPhone ? { phone: contactPhone } : undefined, link: '/admin/waitlist' })
    db.update('waitlist', (list) => [
      ...list,
      {
        id: newId('wl'),
        contactName: 'Minor — safeguarding',
        contactPhone: contactPhone ?? '',
        language: 'si',
        kind: 'callback',
        status: 'open',
        createdAt: new Date().toISOString(),
      },
    ])
    audit('record.create', ctx, 'safeguarding', 'Minor without caregiver support')
    return { ok: true }
  })

  r.on('post', '/self-assessments', ({ ctx, body }) => {
    // FR-028: saved only for registered beneficiaries. Anonymous users never call this.
    const user = requireRole(ctx, 'beneficiary')
    const data = body as Pick<SelfAssessmentResult, 'tool' | 'score' | 'bandKey'>
    const result: SelfAssessmentResult = {
      ...data,
      id: newId('sa'),
      beneficiaryId: user.beneficiaryId!,
      completedAt: new Date().toISOString(),
    }
    db.update('selfAssessments', (list) => [...list, result])
    return result
  })

  r.on('get', '/self-assessments/mine', ({ ctx }) => {
    const user = requireRole(ctx, 'beneficiary')
    return db
      .get('selfAssessments')
      .filter((s) => s.beneficiaryId === user.beneficiaryId)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  })

  r.on('get', '/me/profile', ({ ctx }) => {
    const user = requireRole(ctx, 'beneficiary')
    return findOr404(db.get('beneficiaries'), user.beneficiaryId!)
  })

  r.on('patch', '/me/profile', ({ ctx, body }) => {
    const user = requireRole(ctx, 'beneficiary')
    const current = findOr404(db.get('beneficiaries'), user.beneficiaryId!)
    const allowed = body as Partial<Pick<Beneficiary, 'fullName' | 'preferredName' | 'phone' | 'email' | 'districtId' | 'preferredLanguage' | 'counsellingLanguage' | 'notificationPrefs' | 'gender' | 'dateOfBirth'>>
    const updated: Beneficiary = { ...current, ...allowed, notificationPrefs: { ...current.notificationPrefs, ...allowed.notificationPrefs, minimalContent: true } }
    db.update('beneficiaries', (list) => replaceById(list, updated))
    audit('record.update', ctx, `beneficiary:${current.id}`, 'Profile updated by beneficiary')
    return updated
  })

  r.on('post', '/me/consents/:id/withdraw', ({ ctx, params }) => {
    const user = requireRole(ctx, 'beneficiary')
    const current = findOr404(db.get('beneficiaries'), user.beneficiaryId!)
    const now = new Date().toISOString()
    const updated = { ...current, consents: current.consents.map((c) => (c.id === params.id ? { ...c, withdrawnAt: now } : c)) }
    db.update('beneficiaries', (list) => replaceById(list, updated))
    audit('record.update', ctx, `beneficiary:${current.id}`, `Consent ${params.id} withdrawn`)
    return updated
  })

  r.on('post', '/me/erasure', ({ ctx }) => {
    const user = requireRole(ctx, 'beneficiary')
    const current = findOr404(db.get('beneficiaries'), user.beneficiaryId!)
    const updated = { ...current, erasureRequestedAt: new Date().toISOString() }
    db.update('beneficiaries', (list) => replaceById(list, updated))
    notify({ recipientRole: 'admin', messageKey: 'notif.erasure', link: '/admin/users' })
    audit('record.update', ctx, `beneficiary:${current.id}`, 'Erasure requested (DAT-005)')
    return updated
  })
}
