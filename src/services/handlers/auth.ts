import { DEMO_OTP } from '../../config/defaults'
import { clientCode, newId } from '../../domain/ids'
import type { AuthSession, Beneficiary, DeviceSession, Gender, ID, LanguageCode, User } from '../../types'
import { ApiError, type RequestContext, type Router } from '../router'
import { db } from '../storage'
import { audit, effectiveRoles, findOr404, replaceById, requireUser } from './context'

/** Pending OTP challenges live in memory only; they are never persisted. */
type Challenge =
  | { kind: 'mfa'; userId: ID; deviceLabel: string; userAgent: string }
  | { kind: 'register'; data: RegisterBody }
  | { kind: 'recover'; userId: ID }
const challenges = new Map<string, Challenge>()

export interface RegisterBody {
  fullName: string
  phone: string
  email?: string
  password: string
  preferredLanguage: LanguageCode
  dateOfBirth?: string
  gender?: Gender
  districtId?: string
}

function deviceLabel(userAgent: string): string {
  const browser = /Edg\//.test(userAgent) ? 'Edge' : /Chrome\//.test(userAgent) ? 'Chrome' : /Firefox\//.test(userAgent) ? 'Firefox' : /Safari\//.test(userAgent) ? 'Safari' : 'Browser'
  const os = /Android/.test(userAgent) ? 'Android' : /iPhone|iPad/.test(userAgent) ? 'iOS' : /Mac OS X/.test(userAgent) ? 'macOS' : /Windows/.test(userAgent) ? 'Windows' : /Linux/.test(userAgent) ? 'Linux' : 'Unknown OS'
  return `${browser} on ${os}`
}

/** Create a device session and return the auth payload (FR-008, SEC-010: new id per login). */
export function startSession(user: User, userAgent: string): AuthSession {
  const now = new Date().toISOString()
  const device: DeviceSession = {
    id: newId('dev'),
    userId: user.id,
    deviceLabel: deviceLabel(userAgent),
    userAgent,
    createdAt: now,
    lastSeenAt: now,
    current: true,
  }
  db.update('devices', (list) => [...list, device])
  const updated: User = { ...user, lastLoginAt: now, failedLoginCount: 0 }
  db.update('users', (list) => replaceById(list, updated))
  return { token: device.id, user: updated, deviceSessionId: device.id, effectiveRoles: effectiveRoles(updated) }
}

function findByUsername(username: string): User | undefined {
  const u = username.trim().toLowerCase()
  return db.get('users').find((x) => x.username.toLowerCase() === u)
}

/** Shared by registration and anonymous booking (FR-010): creates the PII record. */
export function createBeneficiary(data: {
  fullName: string
  phone?: string
  email?: string
  dateOfBirth?: string
  gender?: Gender
  districtId?: string
  dsDivisionId?: string
  preferredLanguage?: LanguageCode
  counsellingLanguage?: Beneficiary['counsellingLanguage']
  pendingRegistration?: boolean
}): Beneficiary {
  const list = db.get('beneficiaries')
  const district = data.districtId ?? 'kalutara'
  const prefix = district.slice(0, 3).toUpperCase()
  const now = new Date()
  const b: Beneficiary = {
    id: newId('ben'),
    clientCode: clientCode(prefix, now.getFullYear(), list.length + 1),
    fullName: data.fullName,
    preferredName: data.fullName.split(' ')[0],
    dateOfBirth: data.dateOfBirth || undefined,
    gender: data.gender ?? 'undisclosed',
    phone: data.phone,
    email: data.email || undefined,
    districtId: district,
    dsDivisionId: data.dsDivisionId,
    preferredLanguage: data.preferredLanguage ?? 'si',
    counsellingLanguage: data.counsellingLanguage ?? data.preferredLanguage ?? 'si',
    notificationPrefs: {
      enabled: { appointmentReminder: true, appointmentChange: true, resourceUpdates: false, generalNotices: true },
      channels: { sms: true, email: Boolean(data.email), push: true },
      minimalContent: true,
    },
    consents: [],
    pendingRegistration: data.pendingRegistration ?? false,
    createdAt: now.toISOString(),
  }
  db.update('beneficiaries', (all) => [...all, b])
  return b
}

const userAgentOf = (body: { userAgent?: string }) => body.userAgent ?? 'Unknown'

export function registerAuth(r: Router): void {
  r.on('post', '/auth/login', ({ body, ctx }) => {
    const { username, password } = body as { username: string; password: string; userAgent?: string }
    const user = findByUsername(username)
    const settings = db.get('settings')
    if (!user) {
      audit('login.failure', ctx, `username:${username}`, 'Unknown user')
      throw new ApiError(401, 'invalidCredentials')
    }
    if (user.status === 'locked') throw new ApiError(423, 'accountLocked')
    if (user.status === 'deactivated') throw new ApiError(403, 'accountDeactivated')
    const cred = db.get('credentials').find((c) => c.userId === user.id)
    if (!cred || cred.password !== password) {
      const failed = user.failedLoginCount + 1
      const locked = failed >= settings.lockoutThreshold
      db.update('users', (list) => replaceById(list, { ...user, failedLoginCount: failed, status: locked ? 'locked' : user.status }))
      audit('login.failure', { roles: [], user }, `user:${user.id}`, `Failed attempt ${failed}`)
      if (locked) {
        audit('account.locked', { roles: [], user }, `user:${user.id}`, `Locked after ${failed} failed attempts`)
        throw new ApiError(423, 'accountLocked')
      }
      throw new ApiError(401, 'invalidCredentials', { remaining: settings.lockoutThreshold - failed })
    }
    const mfaRequired = user.mfaEnabled || user.roles.some((role) => settings.mfaRequiredRoles.includes(role))
    if (mfaRequired) {
      const challengeId = newId('chal')
      challenges.set(challengeId, { kind: 'mfa', userId: user.id, deviceLabel: '', userAgent: userAgentOf(body) })
      return { mfaRequired: true, challengeId }
    }
    const session = startSession(user, userAgentOf(body))
    audit('login.success', { roles: session.effectiveRoles, user }, `user:${user.id}`)
    return session
  })

  r.on('post', '/auth/mfa', ({ body }) => {
    const { challengeId, otp } = body as { challengeId: string; otp: string }
    const ch = challenges.get(challengeId)
    if (!ch || ch.kind !== 'mfa') throw new ApiError(400, 'challengeExpired')
    if (otp !== DEMO_OTP) throw new ApiError(401, 'invalidOtp')
    challenges.delete(challengeId)
    const user = findOr404(db.get('users'), ch.userId)
    const session = startSession(user, ch.userAgent)
    audit('login.success', { roles: session.effectiveRoles, user }, `user:${user.id}`, 'With MFA')
    return session
  })

  r.on('post', '/auth/register', ({ body }) => {
    const data = body as RegisterBody
    const username = (data.email || data.phone).trim().toLowerCase()
    if (findByUsername(username) || db.get('users').some((u) => u.username === data.phone)) throw new ApiError(409, 'accountExists')
    const challengeId = newId('chal')
    challenges.set(challengeId, { kind: 'register', data })
    // FR-004: OTP to the contact point. The demo code is shown on screen instead of sent by SMS.
    return { challengeId, otpRequired: db.get('settings').otpRequiredForRegistration }
  })

  r.on('post', '/auth/register/verify', ({ body, ctx }) => {
    const { challengeId, otp, userAgent } = body as { challengeId: string; otp: string; userAgent?: string }
    const ch = challenges.get(challengeId)
    if (!ch || ch.kind !== 'register') throw new ApiError(400, 'challengeExpired')
    if (db.get('settings').otpRequiredForRegistration && otp !== DEMO_OTP) throw new ApiError(401, 'invalidOtp')
    challenges.delete(challengeId)
    const data = ch.data
    const beneficiary = createBeneficiary({ ...data, preferredLanguage: data.preferredLanguage })
    const now = new Date().toISOString()
    db.update('beneficiaries', (list) =>
      replaceById(list, {
        ...beneficiary,
        consents: [{ id: newId('cons'), purpose: 'dataProcessing', givenAt: now, wordingVersion: 'draft-0.1' }],
      }),
    )
    const user: User = {
      id: newId('u'),
      username: (data.email || data.phone).trim().toLowerCase(),
      displayName: beneficiary.preferredName ?? data.fullName,
      roles: ['beneficiary'],
      status: 'active',
      preferredLanguage: data.preferredLanguage,
      mfaEnabled: false,
      failedLoginCount: 0,
      beneficiaryId: beneficiary.id,
      createdAt: now,
    }
    db.update('users', (list) => [...list, user])
    db.update('credentials', (list) => [...list, { userId: user.id, password: data.password }])
    audit('record.create', ctx, `user:${user.id}`, 'Beneficiary self-registration')
    return startSession(user, userAgent ?? 'Unknown')
  })

  r.on('post', '/auth/recover', ({ body }) => {
    const user = findByUsername((body as { username: string }).username)
    const challengeId = newId('chal')
    // Do not reveal whether the account exists.
    if (user) challenges.set(challengeId, { kind: 'recover', userId: user.id })
    return { challengeId }
  })

  r.on('post', '/auth/recover/reset', ({ body }) => {
    const { challengeId, otp, newPassword } = body as { challengeId: string; otp: string; newPassword: string }
    const ch = challenges.get(challengeId)
    if (otp !== DEMO_OTP) throw new ApiError(401, 'invalidOtp')
    if (!ch || ch.kind !== 'recover') throw new ApiError(400, 'challengeExpired')
    challenges.delete(challengeId)
    db.update('credentials', (list) => list.map((c) => (c.userId === ch.userId ? { ...c, password: newPassword } : c)))
    const user = findOr404(db.get('users'), ch.userId)
    db.update('users', (list) => replaceById(list, { ...user, failedLoginCount: 0, status: user.status === 'locked' ? 'active' : user.status }))
    audit('security', { roles: [], user }, `user:${user.id}`, 'Password reset via recovery')
    return { ok: true }
  })

  r.on('post', '/auth/logout', ({ ctx }) => {
    if (ctx.deviceSessionId) {
      const now = new Date().toISOString()
      db.update('devices', (list) => list.map((d) => (d.id === ctx.deviceSessionId ? { ...d, revokedAt: now } : d)))
      audit('logout', ctx, `user:${ctx.user?.id}`)
    }
    return { ok: true }
  })

  r.on('get', '/auth/me', ({ ctx }) => {
    const user = requireUser(ctx)
    return { user, effectiveRoles: ctx.roles }
  })

  r.on('get', '/auth/devices', ({ ctx }) => {
    const user = requireUser(ctx)
    return db
      .get('devices')
      .filter((d) => d.userId === user.id && !d.revokedAt)
      .map((d) => ({ ...d, current: d.id === ctx.deviceSessionId }))
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
  })

  r.on('delete', '/auth/devices/:id', ({ ctx, params }) => {
    const user = requireUser(ctx)
    const device = findOr404(db.get('devices'), params.id)
    if (device.userId !== user.id) throw new ApiError(403, 'forbidden')
    db.update('devices', (list) => replaceById(list, { ...device, revokedAt: new Date().toISOString() }))
    audit('security', ctx, `device:${device.id}`, 'Session revoked by user')
    return { ok: true }
  })

  r.on('patch', '/auth/mfa', ({ ctx, body }) => {
    const user = requireUser(ctx)
    const updated = { ...user, mfaEnabled: Boolean((body as { enabled: boolean }).enabled) }
    db.update('users', (list) => replaceById(list, updated))
    audit('security', ctx, `user:${user.id}`, `MFA ${updated.mfaEnabled ? 'enabled' : 'disabled'}`)
    return updated
  })

  r.on('post', '/auth/password', ({ ctx, body }) => {
    const user = requireUser(ctx)
    const { current, next } = body as { current: string; next: string }
    const cred = db.get('credentials').find((c) => c.userId === user.id)
    if (!cred || cred.password !== current) throw new ApiError(401, 'invalidCredentials')
    db.update('credentials', (list) => list.map((c) => (c.userId === user.id ? { ...c, password: next } : c)))
    audit('security', ctx, `user:${user.id}`, 'Password changed')
    return { ok: true }
  })

  r.on('patch', '/auth/language', ({ ctx, body }) => {
    const user = requireUser(ctx)
    const updated = { ...user, preferredLanguage: (body as { language: LanguageCode }).language }
    db.update('users', (list) => replaceById(list, updated))
    return updated
  })
}

/** Guest account for an anonymous person who books (FR-010) so they can manage that booking. */
export function createGuestSession(beneficiary: Beneficiary, ctx: RequestContext, userAgent: string): AuthSession {
  const now = new Date().toISOString()
  const user: User = {
    id: newId('u'),
    username: beneficiary.phone ?? beneficiary.id,
    displayName: beneficiary.preferredName ?? beneficiary.fullName,
    roles: ['beneficiary'],
    status: 'active',
    preferredLanguage: beneficiary.preferredLanguage,
    mfaEnabled: false,
    failedLoginCount: 0,
    beneficiaryId: beneficiary.id,
    createdAt: now,
  }
  db.update('users', (list) => [...list, user])
  audit('record.create', ctx, `beneficiary:${beneficiary.id}`, 'Beneficiary record created at booking')
  return startSession(user, userAgent)
}
