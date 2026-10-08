import type { ID, ISODateTime, Localized } from './common'
import type { Role } from './auth'

/** Data types the Role and Permission Matrix must cover (bid Annex 4). */
export type DataType =
  | 'beneficiaryProfile'
  | 'selfAssessmentResults'
  | 'screeningRecords'
  | 'intakeRecords'
  | 'assessmentRecords'
  | 'sessionNotes'
  | 'sessionHistory'
  | 'journalEntries'
  | 'moodEntries'
  | 'emergencyAlerts'
  | 'auditLog'
  | 'resourceContent'
  | 'systemConfiguration'
  | 'reports'

export type PermissionAction = 'view' | 'create' | 'amend' | 'delete'

/**
 * Scope of a granted permission.
 * - all: every record
 * - own: records the user owns or is assigned to (own profile / own cases)
 * - aggregate: de-identified totals only (reports, dashboards)
 */
export type PermissionScope = 'all' | 'own' | 'aggregate'

export type PermissionMatrix = Record<Role, Partial<Record<DataType, Partial<Record<PermissionAction, PermissionScope>>>>>

export type ResourceKind = 'article' | 'video' | 'audio' | 'download'
export type PublishState = 'draft' | 'published' | 'withdrawn'

export interface ResourceVersion {
  title: string
  summary: string
  body: string
  /** Placeholder media/download reference. */
  mediaUrl?: string
}

/** Resource centre item with per-language versions (FR-045–050, FR-078). */
export interface ResourceItem {
  id: ID
  kind: ResourceKind
  topic: 'stress' | 'anxiety' | 'mood' | 'family' | 'sleep' | 'substance' | 'wellbeing'
  versions: Partial<Localized<ResourceVersion>>
  state: PublishState
  updatedAt: ISODateTime
  publishedAt?: ISODateTime
}

/** Administrator-configurable parameters (FR-080). Values are placeholders pending Ministry confirmation. */
export interface Settings {
  idleTimeoutMin: number
  idleWarningSec: number
  lockoutThreshold: number
  mfaRequiredRoles: Role[]
  otpRequiredForRegistration: boolean
  escalationPeriodMin: number
  escalationPath: string[]
  cancellationNoticeHours: number
  noShowAfterMin: number
  maxSessionsPerClient: number
  maxSessionDurationMin: number
  minorAgeThreshold: number
  groupDefaultCapacity: number
  groupMaxCapacity: number
  maxFileSizeMb: number
  allowedFileTypes: string[]
  dashboardRefreshMin: number
  maintenanceNotice?: string
}

export type AuditEventType =
  | 'login.success'
  | 'login.failure'
  | 'logout'
  | 'account.locked'
  | 'record.create'
  | 'record.update'
  | 'record.delete'
  | 'admin.action'
  | 'role.change'
  | 'config.change'
  | 'alert.raised'
  | 'alert.acknowledged'
  | 'alert.escalated'
  | 'alert.closed'
  | 'security'

/** Append-only audit entry (SEC-024/025). */
export interface AuditEntry {
  id: ID
  at: ISODateTime
  type: AuditEventType
  actorUserId?: ID
  /** e.g. "appointment:apt_12". */
  target?: string
  detail?: string
}

/** Minimal-content staff/admin notification (FR-063 compliant wording only). */
export interface Notification {
  id: ID
  recipientUserId?: ID
  recipientRole?: Role
  /** i18n key plus params; rendered text never contains clinical detail. */
  messageKey: string
  params?: Record<string, string>
  link?: string
  createdAt: ISODateTime
  readAt?: ISODateTime
}
