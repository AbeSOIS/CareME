import { parseISO } from 'date-fns'
import { ageOn, isMinor } from '../../domain/age'
import { newId } from '../../domain/ids'
import { slotId, type AvailabilityPattern } from '../../domain/slots'
import type {
  AssessmentForm,
  CaseDetail,
  CaseRecord,
  ClientSummary,
  FollowUp,
  Gender,
  ID,
  IntakeForm,
  Referral,
  ScreeningForm,
  SessionMode,
  SessionNote,
  BeneficiaryMatch,
} from '../../types'
import { ApiError, type RequestContext, type Router } from '../router'
import { db } from '../storage'
import { createBeneficiary } from './auth'
import { slotsFor, sweepNoShows, pushEvent, toView } from './booking'
import { audit, counsellorIdOf, findOr404, notify, permissionScope, replaceById, requirePermission, requireRole } from './context'

/** A counsellor may open a case only if it is theirs (own scope) — Annex 4 draft. */
function caseFor(ctx: RequestContext, caseId: ID, dataType: Parameters<typeof requirePermission>[1] = 'sessionHistory'): CaseRecord {
  const scope = requirePermission(ctx, dataType, 'view')
  const record = findOr404(db.get('cases'), caseId)
  if (scope === 'own' && record.counsellorId !== ctx.user?.counsellorId) throw new ApiError(403, 'forbidden')
  if (scope === 'aggregate') throw new ApiError(403, 'forbidden')
  return record
}

function saveCase(record: CaseRecord): CaseRecord {
  const updated = { ...record, updatedAt: new Date().toISOString() }
  db.update('cases', (list) => replaceById(list, updated))
  return updated
}

function requireAmend(ctx: RequestContext, record: CaseRecord, dataType: Parameters<typeof requirePermission>[1]): void {
  const scope = requirePermission(ctx, dataType, 'amend')
  if (scope === 'own' && record.counsellorId !== ctx.user?.counsellorId) throw new ApiError(403, 'forbidden')
}

function summarise(record: CaseRecord): ClientSummary {
  const b = findOr404(db.get('beneficiaries'), record.beneficiaryId)
  const threshold = db.get('settings').minorAgeThreshold
  return {
    caseId: record.id,
    beneficiaryId: b.id,
    clientCode: b.clientCode,
    name: b.preferredName ?? b.fullName,
    age: b.dateOfBirth ? ageOn(b.dateOfBirth) : undefined,
    gender: b.gender,
    minor: isMinor(b.dateOfBirth, threshold),
    status: record.status,
    openedAt: record.openedAt,
    sessions: db.get('appointments').filter((a) => a.beneficiaryId === b.id && a.status === 'completed').length,
    primaryCategory: record.primaryCategory,
    pendingRegistration: b.pendingRegistration,
  }
}

export function registerCounsellor(r: Router): void {
  /* ---------- Appointments (FR-065, FR-022) ---------- */

  r.on('get', '/counsellor/appointments', ({ ctx }) => {
    const cid = counsellorIdOf(ctx)
    sweepNoShows()
    return db
      .get('appointments')
      .filter((a) => a.counsellorId === cid)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((a) => toView(a, true))
  })

  const ownApt = (ctx: RequestContext, id: ID) => {
    const cid = counsellorIdOf(ctx)
    const apt = findOr404(db.get('appointments'), id)
    if (apt.counsellorId !== cid) throw new ApiError(403, 'forbidden')
    return apt
  }
  const notifyClient = (beneficiaryId: ID) => {
    const user = db.get('users').find((u) => u.beneficiaryId === beneficiaryId)
    if (user) notify({ recipientUserId: user.id, messageKey: 'notif.appointmentChanged', link: '/me/appointments' })
  }

  r.on('post', '/appointments/:id/accept', ({ ctx, params }) => {
    const apt = ownApt(ctx, params.id)
    if (apt.status !== 'requested') throw new ApiError(409, 'invalidState')
    const updated = pushEvent(apt, { type: 'accepted', byUserId: ctx.user?.id }, { status: 'confirmed' })
    notifyClient(apt.beneficiaryId)
    audit('record.update', ctx, `appointment:${apt.id}`, 'Accepted')
    return toView(updated, true)
  })

  r.on('post', '/appointments/:id/reject', ({ ctx, params, body }) => {
    const apt = ownApt(ctx, params.id)
    if (apt.status !== 'requested') throw new ApiError(409, 'invalidState')
    const updated = pushEvent(apt, { type: 'rejected', byUserId: ctx.user?.id, note: (body as { reason?: string }).reason }, { status: 'rejected' })
    notifyClient(apt.beneficiaryId)
    audit('record.update', ctx, `appointment:${apt.id}`, 'Rejected')
    return toView(updated, true)
  })

  r.on('post', '/appointments/:id/complete', ({ ctx, params }) => {
    const apt = ownApt(ctx, params.id)
    if (apt.status !== 'confirmed') throw new ApiError(409, 'invalidState')
    const updated = pushEvent(apt, { type: 'completed', byUserId: ctx.user?.id }, { status: 'completed', joinedAt: apt.joinedAt ?? new Date().toISOString() })
    audit('record.update', ctx, `appointment:${apt.id}`, 'Completed')
    return toView(updated, true)
  })

  r.on('post', '/appointments/:id/no-show', ({ ctx, params }) => {
    const apt = ownApt(ctx, params.id)
    if (apt.status !== 'confirmed' || parseISO(apt.start) > new Date()) throw new ApiError(409, 'invalidState')
    const updated = pushEvent(apt, { type: 'noShow', byUserId: ctx.user?.id }, { status: 'noShow' })
    audit('record.update', ctx, `appointment:${apt.id}`, 'No-show recorded')
    return toView(updated, true)
  })

  /** FR-022: reassignment by an authorised user, only to a counsellor offering the same language. */
  r.on('post', '/appointments/:id/reassign', ({ ctx, params, body }) => {
    const apt = findOr404(db.get('appointments'), params.id)
    const isOwner = ctx.user?.counsellorId === apt.counsellorId
    if (!isOwner) requireRole(ctx, 'admin')
    const target = findOr404(db.get('counsellors'), (body as { counsellorId: ID }).counsellorId)
    if (!target.active || !target.languages.includes(apt.language)) throw new ApiError(422, 'languageMismatch')
    if (!['requested', 'confirmed'].includes(apt.status)) throw new ApiError(409, 'invalidState')
    const start = parseISO(apt.start)
    const newSlotId = slotId(target.id, start)
    const clash = db.get('appointments').some((a) => a.counsellorId === target.id && a.slotId === newSlotId && ['requested', 'confirmed'].includes(a.status))
    if (clash) throw new ApiError(409, 'slotUnavailable')
    db.update('availability', (list) =>
      list.map((a) =>
        a.counsellorId === target.id && !a.extra.some((s) => s.id === newSlotId)
          ? { ...a, extra: [...a.extra, { id: newSlotId, counsellorId: target.id, start: apt.start, durationMin: apt.durationMin, modes: [apt.mode], blocked: false }] }
          : a,
      ),
    )
    const updated = pushEvent(apt, { type: 'reassigned', byUserId: ctx.user?.id, note: `→ ${target.fullName}` }, { counsellorId: target.id, slotId: newSlotId, status: 'requested' })
    db.update('cases', (list) => list.map((c) => (c.beneficiaryId === apt.beneficiaryId ? { ...c, counsellorId: target.id } : c)))
    const targetUser = db.get('users').find((u) => u.counsellorId === target.id)
    if (targetUser) notify({ recipientUserId: targetUser.id, messageKey: 'notif.newRequest', link: '/counsellor/appointments' })
    notifyClient(apt.beneficiaryId)
    audit('record.update', ctx, `appointment:${apt.id}`, `Reassigned to ${target.id}`)
    return toView(updated, true)
  })

  /* ---------- Availability (FR-064) ---------- */

  r.on('get', '/counsellor/availability', ({ ctx }) => {
    const cid = counsellorIdOf(ctx)
    const availability = db.get('availability').find((a) => a.counsellorId === cid)
    return { availability, slots: slotsFor(cid, 21) }
  })

  r.on('put', '/counsellor/availability', ({ ctx, body }) => {
    const cid = counsellorIdOf(ctx)
    const { maxSessionDurationMin } = db.get('settings')
    const pattern = (body as { pattern: AvailabilityPattern[] }).pattern
    if (pattern.some((p) => p.durationMin > maxSessionDurationMin)) throw new ApiError(422, 'tooLong')
    db.update('availability', (list) => list.map((a) => (a.counsellorId === cid ? { ...a, pattern } : a)))
    audit('record.update', ctx, `availability:${cid}`, 'Weekly pattern updated')
    return { ok: true }
  })

  r.on('post', '/counsellor/slots', ({ ctx, body }) => {
    const cid = counsellorIdOf(ctx)
    const { start, durationMin, modes } = body as { start: string; durationMin: number; modes: SessionMode[] }
    if (durationMin > db.get('settings').maxSessionDurationMin) throw new ApiError(422, 'tooLong')
    const startDate = parseISO(start)
    if (startDate <= new Date()) throw new ApiError(422, 'inPast')
    const id = slotId(cid, startDate)
    db.update('availability', (list) =>
      list.map((a) =>
        a.counsellorId === cid && !a.extra.some((s) => s.id === id)
          ? { ...a, extra: [...a.extra, { id, counsellorId: cid, start: startDate.toISOString(), durationMin, modes, blocked: false }] }
          : a,
      ),
    )
    return { ok: true }
  })

  r.on('post', '/counsellor/slots/:id/block', ({ ctx, params, body }) => {
    const cid = counsellorIdOf(ctx)
    const blocked = (body as { blocked: boolean }).blocked
    db.update('availability', (list) =>
      list.map((a) =>
        a.counsellorId === cid
          ? { ...a, blocked: blocked ? [...new Set([...a.blocked, params.id])] : a.blocked.filter((x) => x !== params.id) }
          : a,
      ),
    )
    return { ok: true }
  })

  /* ---------- Cases (FR-068, FR-031) ---------- */

  r.on('get', '/counsellor/cases', ({ ctx }) => {
    const cid = counsellorIdOf(ctx)
    return db
      .get('cases')
      .filter((c) => c.counsellorId === cid)
      .map(summarise)
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
  })

  /** In-person / walk-in client: the counsellor enters the record directly (pre-bid Q&A). */
  r.on('post', '/counsellor/cases', ({ ctx, body }) => {
    const cid = counsellorIdOf(ctx)
    requirePermission(ctx, 'beneficiaryProfile', 'create')
    const data = body as { fullName: string; phone?: string; dateOfBirth?: string; gender?: Gender; dsDivisionId?: string; counsellingLanguage?: 'si' | 'ta' | 'en' | 'sign' }
    const counsellor = findOr404(db.get('counsellors'), cid)
    const b = createBeneficiary({ ...data, districtId: counsellor.districtId, preferredLanguage: data.counsellingLanguage === 'ta' ? 'ta' : data.counsellingLanguage === 'en' ? 'en' : 'si' })
    const now = new Date().toISOString()
    const record: CaseRecord = { id: newId('case'), beneficiaryId: b.id, counsellorId: cid, openedAt: now, status: 'open', assessments: [], notes: [], followUps: [], updatedAt: now }
    db.update('cases', (list) => [...list, record])
    audit('record.create', ctx, `case:${record.id}`, 'Case opened for in-person client')
    return summarise(record)
  })

  r.on('get', '/cases/:id', ({ ctx, params }): CaseDetail => {
    const record = caseFor(ctx, params.id)
    const beneficiary = findOr404(db.get('beneficiaries'), record.beneficiaryId)
    const canSeeNotes = permissionScope(ctx, 'sessionNotes', 'view')
    const canSeeScreening = permissionScope(ctx, 'screeningRecords', 'view')
    const canSeeIntake = permissionScope(ctx, 'intakeRecords', 'view')
    const canSeeAssessment = permissionScope(ctx, 'assessmentRecords', 'view')
    const canSeeSelf = permissionScope(ctx, 'selfAssessmentResults', 'view')
    sweepNoShows()
    // Fields the caller's role may not see are stripped server-side, not just hidden in the UI.
    const visible: CaseRecord = {
      ...record,
      notes: canSeeNotes ? record.notes : [],
      screening: canSeeScreening ? record.screening : undefined,
      intake: canSeeIntake ? record.intake : undefined,
      assessments: canSeeAssessment ? record.assessments : [],
    }
    return {
      record: visible,
      beneficiary,
      appointments: db
        .get('appointments')
        .filter((a) => a.beneficiaryId === beneficiary.id)
        .sort((a, b) => b.start.localeCompare(a.start))
        .map((a) => toView(a, true)),
      referrals: db.get('referrals').filter((x) => x.beneficiaryId === beneficiary.id),
      selfAssessments: canSeeSelf ? db.get('selfAssessments').filter((s) => s.beneficiaryId === beneficiary.id) : [],
    }
  })

  r.on('put', '/cases/:id/screening', ({ ctx, params, body }) => {
    const record = caseFor(ctx, params.id, 'screeningRecords')
    requireAmend(ctx, record, 'screeningRecords')
    audit(record.screening ? 'record.update' : 'record.create', ctx, `case:${record.id}`, 'Form A (Screening)')
    return saveCase({ ...record, screening: body as ScreeningForm })
  })

  r.on('put', '/cases/:id/intake', ({ ctx, params, body }) => {
    const record = caseFor(ctx, params.id, 'intakeRecords')
    requireAmend(ctx, record, 'intakeRecords')
    audit(record.intake ? 'record.update' : 'record.create', ctx, `case:${record.id}`, 'Form B (Intake)')
    return saveCase({ ...record, intake: body as IntakeForm })
  })

  r.on('post', '/cases/:id/assessments', ({ ctx, params, body }) => {
    const record = caseFor(ctx, params.id, 'assessmentRecords')
    requireAmend(ctx, record, 'assessmentRecords')
    const form = { ...(body as Omit<AssessmentForm, 'id'>), id: newId('as') }
    audit('record.create', ctx, `case:${record.id}`, 'Assessment form')
    return saveCase({ ...record, assessments: [...record.assessments, form] })
  })

  r.on('put', '/cases/:id/assessments/:aid', ({ ctx, params, body }) => {
    const record = caseFor(ctx, params.id, 'assessmentRecords')
    requireAmend(ctx, record, 'assessmentRecords')
    const form = { ...(body as AssessmentForm), id: params.aid }
    audit('record.update', ctx, `case:${record.id}`, 'Assessment form')
    return saveCase({ ...record, assessments: record.assessments.map((a) => (a.id === params.aid ? form : a)) })
  })

  r.on('post', '/cases/:id/notes', ({ ctx, params, body }) => {
    const record = caseFor(ctx, params.id, 'sessionNotes')
    requireAmend(ctx, record, 'sessionNotes')
    const note: SessionNote = { ...(body as Omit<SessionNote, 'id' | 'authorId'>), id: newId('note'), authorId: ctx.user!.id }
    audit('record.create', ctx, `case:${record.id}`, 'Session note')
    return saveCase({ ...record, notes: [...record.notes, note], primaryCategory: record.primaryCategory ?? note.category })
  })

  r.on('patch', '/cases/:id', ({ ctx, params, body }) => {
    const record = caseFor(ctx, params.id)
    requireAmend(ctx, record, 'sessionNotes')
    const patch = body as Partial<Pick<CaseRecord, 'status' | 'primaryCategory'>>
    audit('record.update', ctx, `case:${record.id}`, `Case ${JSON.stringify(patch)}`)
    return saveCase({ ...record, ...patch })
  })

  r.on('post', '/cases/:id/followups', ({ ctx, params, body }) => {
    const record = caseFor(ctx, params.id, 'sessionNotes')
    requireAmend(ctx, record, 'sessionNotes')
    const fu: FollowUp = { ...(body as Pick<FollowUp, 'title' | 'dueDate'>), id: newId('fu'), status: 'open', createdAt: new Date().toISOString() }
    return saveCase({ ...record, followUps: [...record.followUps, fu] })
  })

  r.on('patch', '/cases/:id/followups/:fid', ({ ctx, params, body }) => {
    const record = caseFor(ctx, params.id, 'sessionNotes')
    requireAmend(ctx, record, 'sessionNotes')
    const status = (body as { status: FollowUp['status'] }).status
    const now = new Date().toISOString()
    return saveCase({
      ...record,
      followUps: record.followUps.map((f) => (f.id === params.fid ? { ...f, status, closedAt: status === 'done' ? now : undefined } : f)),
    })
  })

  /* ---------- Referrals (FR-071, FR-073) ---------- */

  r.on('get', '/referrals', ({ ctx }) => {
    const user = requireRole(ctx, 'counsellor', 'admin')
    const all = db.get('referrals')
    const list = ctx.roles.includes('admin') ? all : all.filter((x) => x.counsellorId === user.counsellorId || (!x.counsellorId && x.direction === 'inbound'))
    return list
      .map((x) => {
        const b = x.beneficiaryId ? db.get('beneficiaries').find((y) => y.id === x.beneficiaryId) : undefined
        const caseId = x.beneficiaryId ? db.get('cases').find((c) => c.beneficiaryId === x.beneficiaryId)?.id : undefined
        return { ...x, caseId, clientCode: b?.clientCode, clientName: b?.preferredName ?? b?.fullName, pendingRegistration: b?.pendingRegistration ?? false }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  r.on('post', '/referrals', ({ ctx, body }) => {
    const user = requireRole(ctx, 'counsellor', 'admin')
    const data = body as Omit<Referral, 'id' | 'status' | 'actions' | 'enteredByUserId' | 'createdAt'> & { createPending?: boolean }
    let beneficiaryId = data.beneficiaryId
    if (!beneficiaryId && data.direction === 'inbound' && data.createPending) {
      // FR-073: no profile yet — create one pending registration (duplicate check happens in the UI first).
      const b = createBeneficiary({ fullName: data.contactName || 'Unnamed referral', phone: data.contactPhone, districtId: data.receivingDistrictId, dsDivisionId: data.receivingDsDivisionId, pendingRegistration: true })
      beneficiaryId = b.id
    }
    const { createPending: _ignored, ...rest } = data
    void _ignored
    const referral: Referral = {
      ...rest,
      beneficiaryId,
      counsellorId: data.counsellorId ?? user.counsellorId,
      id: newId('ref'),
      status: data.direction === 'outbound' ? 'actioned' : 'received',
      actions: [],
      enteredByUserId: user.id,
      createdAt: new Date().toISOString(),
    }
    db.update('referrals', (list) => [...list, referral])
    if (referral.direction === 'inbound' && referral.counsellorId) {
      const cu = db.get('users').find((u) => u.counsellorId === referral.counsellorId)
      if (cu && cu.id !== user.id) notify({ recipientUserId: cu.id, messageKey: 'notif.referralReceived', link: '/counsellor/referrals' })
    }
    if (beneficiaryId && referral.counsellorId && !db.get('cases').some((c) => c.beneficiaryId === beneficiaryId)) {
      const now = new Date().toISOString()
      db.update('cases', (list) => [...list, { id: newId('case'), beneficiaryId: beneficiaryId!, counsellorId: referral.counsellorId!, openedAt: now, status: 'open', assessments: [], notes: [], followUps: [], updatedAt: now }])
    }
    audit('record.create', ctx, `referral:${referral.id}`, `${referral.direction} referral`)
    return referral
  })

  r.on('patch', '/referrals/:id', ({ ctx, params, body }) => {
    const user = requireRole(ctx, 'counsellor', 'admin')
    const current = findOr404(db.get('referrals'), params.id)
    const patch = body as { status?: Referral['status']; action?: string; beneficiaryId?: ID; counsellorId?: ID }
    const updated: Referral = {
      ...current,
      status: patch.status ?? current.status,
      beneficiaryId: patch.beneficiaryId ?? current.beneficiaryId,
      counsellorId: patch.counsellorId ?? current.counsellorId,
      actions: patch.action ? [...current.actions, { at: new Date().toISOString(), byUserId: user.id, text: patch.action }] : current.actions,
    }
    db.update('referrals', (list) => replaceById(list, updated))
    audit('record.update', ctx, `referral:${current.id}`, patch.status ? `Status → ${patch.status}` : 'Action recorded')
    return updated
  })

  /** Duplicate check before linking or creating a beneficiary (FR-073). Minimal fields only. */
  r.on('get', '/beneficiaries/search', ({ ctx, query }): BeneficiaryMatch[] => {
    requireRole(ctx, 'counsellor', 'admin')
    const name = (query.name ?? '').trim().toLowerCase()
    const phone = (query.phone ?? '').replace(/\D/g, '')
    const dob = query.dateOfBirth ?? ''
    if (!name && !phone && !dob) return []
    return db
      .get('beneficiaries')
      .map((b) => {
        const matchedOn: BeneficiaryMatch['matchedOn'] = []
        if (name && b.fullName.toLowerCase().includes(name)) matchedOn.push('name')
        if (phone.length >= 6 && b.phone?.replace(/\D/g, '').endsWith(phone.slice(-6))) matchedOn.push('phone')
        if (dob && b.dateOfBirth === dob) matchedOn.push('dateOfBirth')
        return { b, matchedOn }
      })
      .filter((x) => x.matchedOn.length)
      .slice(0, 8)
      .map(({ b, matchedOn }) => ({ id: b.id, clientCode: b.clientCode, name: b.fullName, phone: b.phone, dateOfBirth: b.dateOfBirth, pendingRegistration: b.pendingRegistration, matchedOn }))
  })

  r.on('get', '/counsellors-directory', ({ ctx }) => {
    requireRole(ctx, 'counsellor', 'admin')
    return db.get('counsellors').filter((c) => c.active)
  })
}
