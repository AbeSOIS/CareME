import type { ID, ISODate, ISODateTime } from './common'

export type AlertSource = 'beneficiary' | 'anonymous' | 'counsellorRisk'

export type AlertStatus = 'open' | 'acknowledged' | 'escalated' | 'closed'

/** What the Emergency Officer records against an alert (FR-056). */
export interface AlertOutcome {
  psychologicalFirstAid: boolean
  individualCounselling: boolean
  referral: 'none' | 'hospital' | 'police' | 'protectivePlace' | 'other'
  referralDetails?: string
  externalServiceNotified?: string
  outcome: 'safe' | 'referred' | 'ongoingSupport' | 'unreachable' | 'other'
  summary: string
  recordedAt: ISODateTime
  recordedByUserId: ID
}

export interface AlertEscalation {
  at: ISODateTime
  level: number
  reason: 'timeout' | 'manual'
  /** Who it escalated to (role or named person on the Ministry-confirmed path). */
  to: string
  byUserId?: ID
}

export interface Alert {
  id: ID
  source: AlertSource
  /** Set when raised by a registered beneficiary or about a known client. */
  beneficiaryId?: ID
  /** Optional number given by an anonymous user (FR-059). */
  contactPhone?: string
  raisedByUserId?: ID
  /** Free text from the person raising it, or the counsellor's risk note. */
  message?: string
  raisedAt: ISODateTime
  assignedOfficerUserId?: ID
  acknowledgedAt?: ISODateTime
  acknowledgedByUserId?: ID
  escalations: AlertEscalation[]
  status: AlertStatus
  outcome?: AlertOutcome
}

/** Weekly Emergency Officer designation (FR-052, FR-083). */
export interface RosterEntry {
  id: ID
  /** Monday of the designated week. */
  weekStart: ISODate
  officerUserId: ID
  backupUserId?: ID
}

/** Recorded handover at each change of Emergency Officer (FR-058). */
export interface Handover {
  id: ID
  fromUserId?: ID
  toUserId: ID
  openAlertIds: ID[]
  at: ISODateTime
  acknowledgedAt?: ISODateTime
}
