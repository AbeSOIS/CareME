import { weekStartOf } from '../../domain/alerts'
import { newId } from '../../domain/ids'
import { scopeFor } from '../../domain/permissions'
import type { AuditEventType, DataType, ID, Notification, PermissionAction, PermissionScope, Role, User } from '../../types'
import { ApiError, type RequestContext } from '../router'
import { db } from '../storage'

/** Roles in force for a user right now: stored roles plus Emergency Officer while rostered (FR-052). */
export function effectiveRoles(user: User, now: Date = new Date()): Role[] {
  const roles = new Set<Role>(user.roles)
  const entry = db.get('roster').find((r) => r.weekStart === weekStartOf(now))
  if (entry?.officerUserId === user.id) roles.add('emergencyOfficer')
  return [...roles]
}

export function resolveContext(token: string | undefined): RequestContext {
  if (!token) return { roles: ['anonymous'] }
  const device = db.get('devices').find((d) => d.id === token)
  if (!device) throw new ApiError(401, 'sessionExpired')
  if (device.revokedAt) throw new ApiError(401, 'sessionRevoked')
  const user = db.get('users').find((u) => u.id === device.userId)
  if (!user || user.status !== 'active') throw new ApiError(401, 'sessionExpired')
  db.update('devices', (list) => list.map((d) => (d.id === device.id ? { ...d, lastSeenAt: new Date().toISOString() } : d)))
  return { user, roles: effectiveRoles(user), deviceSessionId: device.id }
}

export function requireUser(ctx: RequestContext): User {
  if (!ctx.user) throw new ApiError(401, 'loginRequired')
  return ctx.user
}

export function requireRole(ctx: RequestContext, ...roles: Role[]): User {
  const user = requireUser(ctx)
  if (!roles.some((r) => ctx.roles.includes(r))) throw new ApiError(403, 'forbidden')
  return user
}

/** Server-side Role and Permission Matrix check (SEC-008): deny unless granted. */
export function requirePermission(ctx: RequestContext, dataType: DataType, action: PermissionAction): PermissionScope {
  const scope = scopeFor(db.get('permissions'), ctx.roles, dataType, action)
  if (!scope) throw new ApiError(403, 'forbidden')
  return scope
}

export function permissionScope(ctx: RequestContext, dataType: DataType, action: PermissionAction): PermissionScope | null {
  return scopeFor(db.get('permissions'), ctx.roles, dataType, action)
}

/** Append-only audit log (SEC-024/025). */
export function audit(type: AuditEventType, ctx: RequestContext | undefined, target?: string, detail?: string): void {
  db.update('audit', (list) => [
    ...list,
    { id: newId('aud'), at: new Date().toISOString(), type, actorUserId: ctx?.user?.id, target, detail },
  ])
}

/** Minimal-content notification (FR-063): only an i18n key and non-clinical params. */
export function notify(n: Omit<Notification, 'id' | 'createdAt'>): void {
  db.update('notifications', (list) => [...list, { ...n, id: newId('n'), createdAt: new Date().toISOString() }])
}

export function counsellorIdOf(ctx: RequestContext): ID {
  const user = requireRole(ctx, 'counsellor')
  if (!user.counsellorId) throw new ApiError(403, 'forbidden')
  return user.counsellorId
}

export function findOr404<T extends { id: ID }>(list: readonly T[], id: ID): T {
  const item = list.find((x) => x.id === id)
  if (!item) throw new ApiError(404, 'notFound')
  return item
}

export function replaceById<T extends { id: ID }>(list: readonly T[], item: T): T[] {
  return list.map((x) => (x.id === item.id ? item : x))
}
