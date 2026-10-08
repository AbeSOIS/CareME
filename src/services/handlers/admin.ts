import { parseISO } from 'date-fns'
import { DEMO_PASSWORD } from '../../config/defaults'
import { newId } from '../../domain/ids'
import { DEFAULT_PERMISSIONS } from '../../domain/permissions'
import type {
  AuditEntry,
  Counsellor,
  GroupSession,
  GroupSessionView,
  ID,
  PermissionMatrix,
  PublishState,
  ResourceItem,
  RosterEntry,
  Settings,
  User,
  WaitlistRequest,
} from '../../types'
import { ApiError, type Router } from '../router'
import { db } from '../storage'
import { audit, findOr404, replaceById, requirePermission, requireRole, requireUser } from './context'

function groupView(g: GroupSession): GroupSessionView {
  const counsellor = db.get('counsellors').find((c) => c.id === g.counsellorId)
  const people = db.get('beneficiaries')
  return {
    ...g,
    counsellorName: counsellor?.fullName ?? '—',
    enrolled: g.enrolledBeneficiaryIds.map((id) => {
      const b = people.find((x) => x.id === id)
      return { id, name: b?.preferredName ?? b?.fullName ?? '—', clientCode: b?.clientCode ?? '—' }
    }),
  }
}

export function registerAdmin(r: Router): void {
  /* ---------- Users (FR-074, FR-076) ---------- */

  r.on('get', '/admin/users', ({ ctx }) => {
    requireRole(ctx, 'admin')
    return db.get('users')
  })

  r.on('post', '/admin/users', ({ ctx, body }) => {
    requireRole(ctx, 'admin')
    const data = body as Pick<User, 'username' | 'displayName' | 'roles' | 'preferredLanguage' | 'counsellorId'>
    if (db.get('users').some((u) => u.username.toLowerCase() === data.username.toLowerCase())) throw new ApiError(409, 'accountExists')
    const user: User = {
      ...data,
      id: newId('u'),
      status: 'active',
      mfaEnabled: false,
      failedLoginCount: 0,
      createdAt: new Date().toISOString(),
    }
    db.update('users', (list) => [...list, user])
    db.update('credentials', (list) => [...list, { userId: user.id, password: DEMO_PASSWORD }])
    audit('admin.action', ctx, `user:${user.id}`, `Account created with roles ${user.roles.join(', ')}`)
    return user
  })

  r.on('patch', '/admin/users/:id', ({ ctx, params, body }) => {
    const admin = requireRole(ctx, 'admin')
    const current = findOr404(db.get('users'), params.id)
    const patch = body as Partial<Pick<User, 'displayName' | 'roles' | 'status' | 'mfaEnabled' | 'counsellorId' | 'preferredLanguage'>>
    if (current.id === admin.id && patch.status && patch.status !== 'active') throw new ApiError(409, 'cannotDeactivateSelf')
    const updated: User = { ...current, ...patch, failedLoginCount: patch.status === 'active' ? 0 : current.failedLoginCount }
    db.update('users', (list) => replaceById(list, updated))
    if (patch.roles) audit('role.change', ctx, `user:${current.id}`, `Roles → ${patch.roles.join(', ')}`)
    if (patch.status) {
      audit('admin.action', ctx, `user:${current.id}`, `Status → ${patch.status}`)
      // Deactivation ends all of that user's sessions.
      if (patch.status !== 'active') {
        const now = new Date().toISOString()
        db.update('devices', (list) => list.map((d) => (d.userId === current.id && !d.revokedAt ? { ...d, revokedAt: now } : d)))
      }
    }
    return updated
  })

  r.on('get', '/admin/beneficiaries', ({ ctx }) => {
    requirePermission(ctx, 'beneficiaryProfile', 'view')
    requireRole(ctx, 'admin')
    return db.get('beneficiaries').map((b) => ({
      id: b.id,
      clientCode: b.clientCode,
      fullName: b.fullName,
      districtId: b.districtId,
      pendingRegistration: b.pendingRegistration,
      erasureRequestedAt: b.erasureRequestedAt,
      createdAt: b.createdAt,
    }))
  })

  /* ---------- Counsellor profiles (FR-075) ---------- */

  r.on('get', '/admin/counsellors', ({ ctx }) => {
    requireRole(ctx, 'admin')
    return db.get('counsellors')
  })

  r.on('post', '/admin/counsellors', ({ ctx, body }) => {
    requireRole(ctx, 'admin')
    const data = body as Omit<Counsellor, 'id'>
    const counsellor: Counsellor = { ...data, id: `c${String(db.get('counsellors').length + 1).padStart(3, '0')}_${Date.now().toString(36)}` }
    db.update('counsellors', (list) => [...list, counsellor])
    db.update('availability', (list) => [...list, { counsellorId: counsellor.id, pattern: [], blocked: [], extra: [] }])
    audit('admin.action', ctx, `counsellor:${counsellor.id}`, 'Counsellor profile created')
    return counsellor
  })

  r.on('patch', '/admin/counsellors/:id', ({ ctx, params, body }) => {
    requireRole(ctx, 'admin')
    const current = findOr404(db.get('counsellors'), params.id)
    const updated = { ...current, ...(body as Partial<Counsellor>), id: current.id }
    updated.signLanguage = updated.languages.includes('sign')
    db.update('counsellors', (list) => replaceById(list, updated))
    audit('admin.action', ctx, `counsellor:${current.id}`, 'Counsellor profile updated')
    return updated
  })

  /* ---------- Roles & permissions (FR-077) ---------- */

  r.on('get', '/admin/permissions', ({ ctx }) => {
    requireRole(ctx, 'admin')
    return db.get('permissions')
  })

  r.on('put', '/admin/permissions', ({ ctx, body }) => {
    requireRole(ctx, 'admin')
    const matrix = (body as { reset?: boolean; matrix?: PermissionMatrix }).reset ? DEFAULT_PERMISSIONS : (body as { matrix: PermissionMatrix }).matrix
    db.set('permissions', matrix)
    audit('role.change', ctx, 'permissions', 'Role and Permission Matrix updated')
    return matrix
  })

  /* ---------- Resource centre (FR-045–050, FR-078) ---------- */

  r.on('get', '/resources', ({ ctx }) => {
    requirePermission(ctx, 'resourceContent', 'view')
    return db.get('resources').filter((x) => x.state === 'published')
  })

  r.on('get', '/resources/:id', ({ ctx, params }) => {
    requirePermission(ctx, 'resourceContent', 'view')
    const item = findOr404(db.get('resources'), params.id)
    if (item.state !== 'published') throw new ApiError(404, 'notFound')
    return item
  })

  r.on('get', '/admin/resources', ({ ctx }) => {
    requirePermission(ctx, 'resourceContent', 'amend')
    return db.get('resources').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  })

  r.on('post', '/admin/resources', ({ ctx, body }) => {
    requirePermission(ctx, 'resourceContent', 'create')
    const now = new Date().toISOString()
    const item: ResourceItem = { ...(body as Omit<ResourceItem, 'id' | 'state' | 'updatedAt'>), id: newId('res'), state: 'draft', updatedAt: now }
    db.update('resources', (list) => [...list, item])
    audit('record.create', ctx, `resource:${item.id}`, 'Resource draft created')
    return item
  })

  r.on('put', '/admin/resources/:id', ({ ctx, params, body }) => {
    requirePermission(ctx, 'resourceContent', 'amend')
    const current = findOr404(db.get('resources'), params.id)
    const updated: ResourceItem = { ...current, ...(body as Partial<ResourceItem>), id: current.id, state: current.state, updatedAt: new Date().toISOString() }
    db.update('resources', (list) => replaceById(list, updated))
    audit('record.update', ctx, `resource:${current.id}`, 'Resource amended')
    return updated
  })

  r.on('post', '/admin/resources/:id/state', ({ ctx, params, body }) => {
    requirePermission(ctx, 'resourceContent', 'amend')
    const current = findOr404(db.get('resources'), params.id)
    const state = (body as { state: PublishState }).state
    const now = new Date().toISOString()
    const updated: ResourceItem = { ...current, state, updatedAt: now, publishedAt: state === 'published' ? now : current.publishedAt }
    db.update('resources', (list) => replaceById(list, updated))
    audit('record.update', ctx, `resource:${current.id}`, `State → ${state}`)
    return updated
  })

  r.on('delete', '/admin/resources/:id', ({ ctx, params }) => {
    requirePermission(ctx, 'resourceContent', 'delete')
    findOr404(db.get('resources'), params.id)
    db.update('resources', (list) => list.filter((x) => x.id !== params.id))
    audit('record.delete', ctx, `resource:${params.id}`)
    return { ok: true }
  })

  /* ---------- Emergency Officer roster (FR-052, FR-083) ---------- */

  r.on('get', '/admin/roster', ({ ctx }) => {
    requireRole(ctx, 'admin', 'emergencyOfficer', 'counsellor')
    const users = db.get('users')
    return {
      roster: db.get('roster').sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
      officers: users.filter((u) => u.roles.includes('counsellor') && u.status === 'active').map((u) => ({ id: u.id, name: u.displayName })),
      handovers: db.get('handovers').sort((a, b) => b.at.localeCompare(a.at)),
    }
  })

  r.on('put', '/admin/roster/:weekStart', ({ ctx, params, body }) => {
    requireRole(ctx, 'admin')
    const data = body as Pick<RosterEntry, 'officerUserId' | 'backupUserId'>
    const existing = db.get('roster').find((x) => x.weekStart === params.weekStart)
    const entry: RosterEntry = { id: existing?.id ?? `ros_${params.weekStart}`, weekStart: params.weekStart, ...data }
    db.update('roster', (list) => (existing ? replaceById(list, entry) : [...list, entry]))
    audit('admin.action', ctx, `roster:${params.weekStart}`, `Emergency Officer → ${data.officerUserId}`)
    return entry
  })

  /* ---------- Group sessions (FR-037–041) ---------- */

  r.on('get', '/groups', ({ ctx }) => {
    const user = requireRole(ctx, 'admin', 'counsellor')
    const all = db.get('groups')
    const list = ctx.roles.includes('admin') ? all : all.filter((g) => g.counsellorId === user.counsellorId)
    return list.sort((a, b) => b.start.localeCompare(a.start)).map(groupView)
  })

  r.on('post', '/groups', ({ ctx, body }) => {
    requireRole(ctx, 'admin', 'counsellor')
    const data = body as Omit<GroupSession, 'id' | 'enrolledBeneficiaryIds' | 'attendance'>
    const { groupMaxCapacity, maxSessionDurationMin } = db.get('settings')
    if (data.capacity < 2 || data.capacity > groupMaxCapacity) throw new ApiError(422, 'capacityOutOfRange', { max: groupMaxCapacity })
    if (data.durationMin > maxSessionDurationMin) throw new ApiError(422, 'tooLong')
    const group: GroupSession = { ...data, id: newId('grp'), enrolledBeneficiaryIds: [], attendance: {} }
    db.update('groups', (list) => [...list, group])
    audit('record.create', ctx, `group:${group.id}`, `Group session scheduled (capacity ${group.capacity})`)
    return groupView(group)
  })

  r.on('patch', '/groups/:id', ({ ctx, params, body }) => {
    requireRole(ctx, 'admin', 'counsellor')
    const g = findOr404(db.get('groups'), params.id)
    const op = body as { enrol?: ID; remove?: ID; attendance?: { beneficiaryId: ID; attended: boolean } }
    let next = g
    if (op.enrol) {
      if (g.enrolledBeneficiaryIds.includes(op.enrol)) throw new ApiError(409, 'alreadyEnrolled')
      if (g.enrolledBeneficiaryIds.length >= g.capacity) throw new ApiError(409, 'groupFull')
      next = { ...g, enrolledBeneficiaryIds: [...g.enrolledBeneficiaryIds, op.enrol] }
    }
    if (op.remove) {
      const attendance = { ...g.attendance }
      delete attendance[op.remove]
      next = { ...g, enrolledBeneficiaryIds: g.enrolledBeneficiaryIds.filter((x) => x !== op.remove), attendance }
    }
    if (op.attendance) {
      if (parseISO(g.start) > new Date()) throw new ApiError(409, 'notStarted')
      next = { ...g, attendance: { ...g.attendance, [op.attendance.beneficiaryId]: op.attendance.attended } }
    }
    db.update('groups', (list) => replaceById(list, next))
    audit('record.update', ctx, `group:${g.id}`, JSON.stringify(op))
    return groupView(next)
  })

  /* ---------- Settings (FR-080) ---------- */

  r.on('get', '/settings', () => db.get('settings'))

  r.on('put', '/settings', ({ ctx, body }) => {
    requirePermission(ctx, 'systemConfiguration', 'amend')
    const prev = db.get('settings')
    const next = { ...prev, ...(body as Partial<Settings>) }
    if (next.groupDefaultCapacity > next.groupMaxCapacity) throw new ApiError(422, 'capacityOutOfRange', { max: next.groupMaxCapacity })
    const changed = (Object.keys(next) as (keyof Settings)[]).filter((k) => JSON.stringify(prev[k]) !== JSON.stringify(next[k]))
    db.set('settings', next)
    for (const key of changed) audit('config.change', ctx, `settings.${key}`, `${JSON.stringify(prev[key])} → ${JSON.stringify(next[key])}`)
    return next
  })

  /* ---------- Audit log (FR-082, SEC-024–026) ---------- */

  r.on('get', '/admin/audit', ({ ctx, query }) => {
    requirePermission(ctx, 'auditLog', 'view')
    const users = db.get('users')
    let list: AuditEntry[] = db.get('audit')
    if (query.userId) list = list.filter((e) => e.actorUserId === query.userId)
    if (query.type) list = list.filter((e) => e.type.startsWith(query.type))
    if (query.from) list = list.filter((e) => e.at >= query.from)
    if (query.to) list = list.filter((e) => e.at <= `${query.to}T23:59:59.999Z`)
    if (query.target) list = list.filter((e) => e.target?.toLowerCase().includes(query.target.toLowerCase()))
    return list
      .slice()
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 500)
      .map((e) => ({ ...e, actorName: users.find((u) => u.id === e.actorUserId)?.displayName }))
  })

  /* ---------- Callback / waitlist (FR-084) ---------- */

  r.on('get', '/admin/waitlist', ({ ctx }) => {
    requireRole(ctx, 'admin')
    return db.get('waitlist').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  r.on('patch', '/admin/waitlist/:id', ({ ctx, params, body }) => {
    requireRole(ctx, 'admin')
    const current = findOr404(db.get('waitlist'), params.id)
    const updated: WaitlistRequest = { ...current, status: (body as { status: WaitlistRequest['status'] }).status }
    db.update('waitlist', (list) => replaceById(list, updated))
    audit('record.update', ctx, `waitlist:${current.id}`, `Status → ${updated.status}`)
    return updated
  })

  /* ---------- Notifications (minimal content, FR-063) ---------- */

  r.on('get', '/notifications', ({ ctx }) => {
    const user = requireUser(ctx)
    return db
      .get('notifications')
      .filter((n) => n.recipientUserId === user.id || (n.recipientRole && ctx.roles.includes(n.recipientRole)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30)
  })

  r.on('post', '/notifications/:id/read', ({ ctx, params }) => {
    requireUser(ctx)
    const n = findOr404(db.get('notifications'), params.id)
    db.update('notifications', (list) => replaceById(list, { ...n, readAt: new Date().toISOString() }))
    return { ok: true }
  })

  r.on('post', '/notifications/read-all', ({ ctx }) => {
    const user = requireUser(ctx)
    const now = new Date().toISOString()
    db.update('notifications', (list) =>
      list.map((n) => (n.recipientUserId === user.id || (n.recipientRole && ctx.roles.includes(n.recipientRole)) ? { ...n, readAt: n.readAt ?? now } : n)),
    )
    return { ok: true }
  })

  r.on('get', '/admin/lookup/beneficiary/:id', ({ ctx, params }) => {
    requireRole(ctx, 'admin', 'counsellor')
    const b = findOr404(db.get('beneficiaries'), params.id as ID)
    return { id: b.id, clientCode: b.clientCode, name: b.preferredName ?? b.fullName }
  })
}
