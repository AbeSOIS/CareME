import type { CounsellingLanguage, ID, ISODateTime } from './common'

export type SessionMode = 'video' | 'audio' | 'chat' | 'inPerson'

/** Published availability (FR-017, FR-064). */
export interface Slot {
  id: ID
  counsellorId: ID
  start: ISODateTime
  /** Minutes; never above the configured maximum (60). */
  durationMin: number
  modes: SessionMode[]
  /** Counsellor has blocked this slot out. */
  blocked: boolean
  /** Appointment currently holding the slot. */
  appointmentId?: ID
}

export type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'lateCancelled'
  | 'completed'
  | 'noShow'

export interface AppointmentEvent {
  at: ISODateTime
  type: 'requested' | 'accepted' | 'rejected' | 'cancelled' | 'rescheduled' | 'reassigned' | 'completed' | 'noShow' | 'joined'
  byUserId?: ID
  note?: string
}

export interface Appointment {
  id: ID
  beneficiaryId: ID
  counsellorId: ID
  slotId: ID
  start: ISODateTime
  durationMin: number
  mode: SessionMode
  language: CounsellingLanguage
  status: AppointmentStatus
  /** Ordinal within the beneficiary's course (max 8). */
  sessionNumber: number
  joinedAt?: ISODateTime
  history: AppointmentEvent[]
  createdAt: ISODateTime
}

/** Callback / waitlist when no suitable slot exists (FR-084, pre-bid fallback rule). */
export interface WaitlistRequest {
  id: ID
  beneficiaryId?: ID
  contactName: string
  contactPhone: string
  districtId?: ID
  language: CounsellingLanguage
  kind: 'callback' | 'waitlist'
  status: 'open' | 'contacted' | 'closed'
  createdAt: ISODateTime
}

export interface GroupSession {
  id: ID
  title: string
  counsellorId: ID
  start: ISODateTime
  durationMin: number
  mode: SessionMode
  /** Set per session when scheduling (FR-037); default 12, ceiling configurable. */
  capacity: number
  dsDivisionId?: ID
  category: SessionCategory
  enrolledBeneficiaryIds: ID[]
  /** beneficiaryId → attended (FR-040). */
  attendance: Record<ID, boolean>
}

/** Problem categories used by the Ministry progress reports. */
export type SessionCategory = 'mentalDisorder' | 'family' | 'relationship' | 'education' | 'economic' | 'drugRelated'
