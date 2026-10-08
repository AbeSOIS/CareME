import type { CounsellingLanguage, Gender, ID, ISODate, ISODateTime, LanguageCode } from './common'

export type NotificationType = 'appointmentReminder' | 'appointmentChange' | 'resourceUpdates' | 'generalNotices'

export type NotificationChannel = 'sms' | 'email' | 'push'

export interface NotificationPreferences {
  enabled: Record<NotificationType, boolean>
  channels: Record<NotificationChannel, boolean>
  /** FR-063: SMS/email/lock-screen previews never mention counselling. Always true; shown read-only. */
  minimalContent: true
}

export interface ConsentRecord {
  id: ID
  purpose: 'counselling' | 'dataProcessing' | 'notifications' | 'guardian'
  givenAt: ISODateTime
  withdrawnAt?: ISODateTime
  /** Wording version shown at capture; pending Ministry-approved text (Annex 6 Part B). */
  wordingVersion: string
}

/** Parent / caregiver consent for a minor (FR-085, Annex 6 Part C – placeholder procedure). */
export interface GuardianConsent {
  id: ID
  guardianName: string
  relationship: 'mother' | 'father' | 'legalGuardian' | 'caregiver' | 'other'
  guardianContact: string
  /** How authority was confirmed; method pending Ministry confirmation. */
  authorityConfirmation: 'selfDeclared' | 'documentSighted' | 'officerVerified'
  consentGiven: boolean
  recordedAt: ISODateTime
}

/**
 * Beneficiary personal data. Stored separately from clinical records and linked by
 * `id` (DAT-008). Created only at booking or during a session (FR-010).
 */
export interface Beneficiary {
  id: ID
  clientCode: string
  fullName: string
  preferredName?: string
  dateOfBirth?: ISODate
  gender: Gender
  phone?: string
  email?: string
  districtId?: ID
  dsDivisionId?: ID
  preferredLanguage: LanguageCode
  counsellingLanguage: CounsellingLanguage
  notificationPrefs: NotificationPreferences
  consents: ConsentRecord[]
  guardianConsent?: GuardianConsent
  /** True when created from an external referral and not yet registered (FR-073). */
  pendingRegistration: boolean
  erasureRequestedAt?: ISODateTime
  createdAt: ISODateTime
}

export interface Counsellor {
  id: ID
  fullName: string
  gender: Gender
  districtId: ID
  dsDivisionId?: ID
  languages: CounsellingLanguage[]
  /** Offers sign-language sessions (pre-bid Q&A, NFR-013). */
  signLanguage: boolean
  /** May take remote sessions with beneficiaries outside their district (pre-bid fallback rule). */
  remoteAllowed: boolean
  active: boolean
  bio: string
  qualifications: string[]
}
