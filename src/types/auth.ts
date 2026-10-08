import type { ID, ISODateTime, LanguageCode } from './common'

/**
 * Platform roles (bid Vol. II §5.2). "Analyst" covers the Dashboard Officer and
 * Counselling Unit team. Emergency Officer is held by a Counsellor while rostered.
 */
export type Role =
  | 'anonymous'
  | 'beneficiary'
  | 'counsellor'
  | 'emergencyOfficer'
  | 'admin'
  | 'analyst'

export const STAFF_ROLES: readonly Role[] = ['counsellor', 'emergencyOfficer', 'admin', 'analyst']

export type AccountStatus = 'active' | 'locked' | 'deactivated'

export interface User {
  id: ID
  /** Login identifier: email or mobile number. */
  username: string
  displayName: string
  roles: Role[]
  status: AccountStatus
  preferredLanguage: LanguageCode
  mfaEnabled: boolean
  failedLoginCount: number
  /** Set for Beneficiary accounts; links to the separately stored PII record (DAT-008). */
  beneficiaryId?: ID
  /** Set for Counsellor accounts. */
  counsellorId?: ID
  createdAt: ISODateTime
  lastLoginAt?: ISODateTime
}

/** Mock-only credential store entry. Never shipped to a real backend. */
export interface MockCredential {
  userId: ID
  password: string
}

/** An active login on a device (FR-008). */
export interface DeviceSession {
  id: ID
  userId: ID
  deviceLabel: string
  userAgent: string
  createdAt: ISODateTime
  lastSeenAt: ISODateTime
  current: boolean
  revokedAt?: ISODateTime
}

export interface AuthSession {
  token: string
  user: User
  deviceSessionId: ID
  /** Effective roles at login, including Emergency Officer when rostered this week. */
  effectiveRoles: Role[]
}
