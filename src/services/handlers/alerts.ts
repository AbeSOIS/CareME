import { currentRosterEntry, dueEscalationLevel, escalationTarget, openAlertIds } from '../../domain/alerts'
import { newId } from '../../domain/ids'
import type { Alert, AlertOutcome, AlertView, Handover, ID, PublicAlertStatus } from '../../types'
import { ApiError, type RequestContext, type Router } from '../router'
import { db } from '../storage'
import { audit, findOr404, notify, permissionScope, replaceById, requirePermission, requireRole } from './context'

function toView(alert: Alert, showIdentity: boolean): AlertView {
  const officer = alert.assignedOfficerUserId ? db.get('users').find((u) => u.id === alert.assignedOfficerUserId) : undefined
  const view: AlertView = { ...alert, assignedOfficerName: officer?.displayName }
  if (alert.beneficiaryId) {
    const b = db.get('beneficiaries').find((x) => x.id === alert.beneficiaryId)
    view.clientCode = b?.clientCode
    // Emergency Officers need a name and phone to make contact; other roles see the code only.
    if (showIdentity) {
      view.clientName = b?.fullName
      view.contactPhone = alert.contactPhone ?? b?.phone
    }
  }
  if (!showIdentity) {
    view.contactPhone = undefined
    view.message = undefined
  }
  return view
}

function save(alert: Alert): Alert {
  db.update('alerts', (list) => replaceById(list, alert))
  return alert
}

/** Escalate every alert whose escalation period has passed (FR-055). Called by a client-side ticker. */
export function escalateDue(ctx?: RequestContext): number {
  const settings = db.get('settings')
  const now = new Date()
  let count = 0
  db.update('alerts', (list) =>
    list.map((a) => {
      const level = dueEscalationLevel(a, settings.escalationPeriodMin, now)
      if (level <= a.escalations.length) return a
      const escalations = [...a.escalations]
      for (let l = a.escalations.length + 1; l <= level; l++) {
        escalations.push({ at: now.toISOString(), level: l, reason: 'timeout', to: escalationTarget(settings.escalationPath, l) })
      }
      count++
      notify({ recipientRole: 'admin', messageKey: 'notif.alertEscalated', link: '/counsellor/alerts' })
      const backup = currentRosterEntry(db.get('roster'), now)?.backupUserId
      if (backup) notify({ recipientUserId: backup, messageKey: 'notif.alertEscalated', link: '/counsellor/alerts' })
      return { ...a, escalations, status: 'escalated' as const }
    }),
  )
  if (count) audit('alert.escalated', ctx, 'alerts', `${count} alert(s) escalated on timeout`)
  return count
}

export function registerAlerts(r: Router): void {
  /** FR-051/057/059: anyone can raise; counsellors raise risk alerts about a client. */
  r.on('post', '/alerts', ({ ctx, body }) => {
    const data = body as { message?: string; contactPhone?: string; beneficiaryId?: ID }
    const isCounsellor = ctx.roles.includes('counsellor') && Boolean(data.beneficiaryId)
    const source: Alert['source'] = isCounsellor ? 'counsellorRisk' : ctx.user?.beneficiaryId ? 'beneficiary' : 'anonymous'
    const entry = currentRosterEntry(db.get('roster'))
    const alert: Alert = {
      id: newId('al'),
      source,
      beneficiaryId: isCounsellor ? data.beneficiaryId : ctx.user?.beneficiaryId,
      contactPhone: data.contactPhone?.trim() || undefined,
      raisedByUserId: ctx.user?.id,
      message: data.message?.trim() || undefined,
      raisedAt: new Date().toISOString(),
      assignedOfficerUserId: entry?.officerUserId,
      escalations: [],
      status: 'open',
    }
    db.update('alerts', (list) => [...list, alert])
    // FR-053: push + SMS to the serving officer. Content is minimal (FR-063).
    if (entry) notify({ recipientUserId: entry.officerUserId, messageKey: 'notif.alertRaised', link: '/counsellor/alerts' })
    else notify({ recipientRole: 'admin', messageKey: 'notif.alertNoOfficer', link: '/admin/roster' })
    audit('alert.raised', ctx, `alert:${alert.id}`, source)
    return { id: alert.id, status: alert.status, acknowledged: false, escalated: false, raisedAt: alert.raisedAt } satisfies PublicAlertStatus
  })

  /** Status the person who raised an alert may poll — no officer or clinical detail. */
  r.on('get', '/alerts/:id/status', ({ params }): PublicAlertStatus => {
    const a = findOr404(db.get('alerts'), params.id)
    return { id: a.id, status: a.status, acknowledged: Boolean(a.acknowledgedAt), escalated: a.escalations.length > 0, raisedAt: a.raisedAt }
  })

  r.on('post', '/alerts/tick', ({ ctx }) => ({ escalated: escalateDue(ctx) }))

  r.on('get', '/alerts', ({ ctx }) => {
    const scope = requirePermission(ctx, 'emergencyAlerts', 'view')
    // Aggregate-only roles (Analyst) use the emergency report, never the case-level queue.
    if (scope === 'aggregate') throw new ApiError(403, 'forbidden')
    const all = db.get('alerts')
    const isOfficer = ctx.roles.includes('emergencyOfficer')
    const list = scope === 'own' ? all.filter((a) => a.raisedByUserId === ctx.user?.id) : all
    const showIdentity = isOfficer || permissionScope(ctx, 'beneficiaryProfile', 'view') === 'all'
    return list.sort((a, b) => b.raisedAt.localeCompare(a.raisedAt)).map((a) => toView(a, showIdentity))
  })

  const officerAlert = (ctx: RequestContext, id: ID) => {
    requirePermission(ctx, 'emergencyAlerts', 'amend')
    return findOr404(db.get('alerts'), id)
  }

  r.on('post', '/alerts/:id/ack', ({ ctx, params }) => {
    const a = officerAlert(ctx, params.id)
    if (a.acknowledgedAt) return toView(a, true)
    const updated = save({ ...a, acknowledgedAt: new Date().toISOString(), acknowledgedByUserId: ctx.user?.id, status: 'acknowledged' })
    audit('alert.acknowledged', ctx, `alert:${a.id}`)
    return toView(updated, true)
  })

  r.on('post', '/alerts/:id/escalate', ({ ctx, params, body }) => {
    const a = officerAlert(ctx, params.id)
    if (a.status === 'closed') throw new ApiError(409, 'invalidState')
    const level = a.escalations.length + 1
    const to = escalationTarget(db.get('settings').escalationPath, level)
    const updated = save({
      ...a,
      escalations: [...a.escalations, { at: new Date().toISOString(), level, reason: 'manual', to, byUserId: ctx.user?.id }],
      status: 'escalated',
    })
    notify({ recipientRole: 'admin', messageKey: 'notif.alertEscalated', link: '/counsellor/alerts' })
    audit('alert.escalated', ctx, `alert:${a.id}`, `Manual escalation to ${to}${(body as { note?: string })?.note ? `: ${(body as { note?: string }).note}` : ''}`)
    return toView(updated, true)
  })

  r.on('post', '/alerts/:id/outcome', ({ ctx, params, body }) => {
    const a = officerAlert(ctx, params.id)
    const outcome: AlertOutcome = { ...(body as Omit<AlertOutcome, 'recordedAt' | 'recordedByUserId'>), recordedAt: new Date().toISOString(), recordedByUserId: ctx.user!.id }
    const updated = save({
      ...a,
      acknowledgedAt: a.acknowledgedAt ?? outcome.recordedAt,
      acknowledgedByUserId: a.acknowledgedByUserId ?? ctx.user?.id,
      outcome,
      status: 'closed',
    })
    audit('alert.closed', ctx, `alert:${a.id}`, `Outcome: ${outcome.outcome}`)
    return toView(updated, true)
  })

  /** FR-058: show the incoming officer every open alert and record the handover. */
  r.on('get', '/alerts/handover', ({ ctx }) => {
    const user = requireRole(ctx, 'emergencyOfficer')
    const entry = currentRosterEntry(db.get('roster'))
    if (!entry || entry.officerUserId !== user.id) return null
    let handover = db.get('handovers').find((h) => h.toUserId === user.id && h.at.slice(0, 10) >= entry.weekStart)
    if (!handover) {
      const previous = db.get('roster').filter((r2) => r2.weekStart < entry.weekStart).sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0]
      handover = {
        id: newId('ho'),
        fromUserId: previous?.officerUserId,
        toUserId: user.id,
        openAlertIds: openAlertIds(db.get('alerts')),
        at: new Date().toISOString(),
      } satisfies Handover
      db.update('handovers', (list) => [...list, handover!])
      audit('record.create', ctx, `handover:${handover.id}`, `${handover.openAlertIds.length} open alert(s) handed over`)
    }
    return handover
  })

  r.on('post', '/alerts/handover/:id/ack', ({ ctx, params }) => {
    requireRole(ctx, 'emergencyOfficer')
    const h = findOr404(db.get('handovers'), params.id)
    const updated = { ...h, acknowledgedAt: new Date().toISOString() }
    db.update('handovers', (list) => replaceById(list, updated))
    audit('record.update', ctx, `handover:${h.id}`, 'Handover acknowledged')
    return updated
  })
}
