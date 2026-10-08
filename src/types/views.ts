import type { Appointment, GroupSession, Slot } from './appointments'
import type { Alert } from './alerts'
import type { Beneficiary, Counsellor } from './people'
import type { CaseRecord, Referral, SelfAssessmentResult } from './cases'
import type { ID } from './common'

/** Shapes returned by the mock API (joined for display). */

export interface CounsellorSummary extends Counsellor {
  nextSlot?: Slot
}

export type SearchResult =
  | { kind: 'local'; offers: Array<{ counsellor: Counsellor; slot: Slot }> }
  | { kind: 'remote'; offer: { counsellor: Counsellor; slot: Slot } }
  | { kind: 'none' }

export interface AppointmentView extends Appointment {
  counsellorName: string
  /** Staff views only. */
  clientCode?: string
  clientName?: string
  caseId?: ID
}

/** Minimal beneficiary fields a counsellor list needs (no clinical data). */
export interface ClientSummary {
  caseId: ID
  beneficiaryId: ID
  clientCode: string
  name: string
  age?: number
  gender: Beneficiary['gender']
  minor: boolean
  status: CaseRecord['status']
  openedAt: string
  sessions: number
  primaryCategory?: CaseRecord['primaryCategory']
  pendingRegistration: boolean
}

export interface CaseDetail {
  record: CaseRecord
  beneficiary: Beneficiary
  appointments: AppointmentView[]
  referrals: Referral[]
  selfAssessments: SelfAssessmentResult[]
}

export interface AlertView extends Alert {
  clientCode?: string
  clientName?: string
  assignedOfficerName?: string
}

export interface PublicAlertStatus {
  id: ID
  status: Alert['status']
  acknowledged: boolean
  escalated: boolean
  raisedAt: string
}

export interface GroupSessionView extends GroupSession {
  counsellorName: string
  enrolled: Array<{ id: ID; name: string; clientCode: string }>
}

export interface BeneficiaryMatch {
  id: ID
  clientCode: string
  name: string
  phone?: string
  dateOfBirth?: string
  pendingRegistration: boolean
  /** Why it matched, for the duplicate check UI. */
  matchedOn: Array<'name' | 'phone' | 'dateOfBirth'>
}
