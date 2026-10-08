import type {
  AlertOutcome,
  AlertView,
  AppointmentView,
  AssessmentForm,
  AuditEntry,
  AuthSession,
  Beneficiary,
  BeneficiaryMatch,
  CaseDetail,
  CaseRecord,
  ClientSummary,
  Counsellor,
  CounsellorSummary,
  CounsellingLanguage,
  DeviceSession,
  FollowUp,
  GroupSession,
  GroupSessionView,
  GuardianConsent,
  Handover,
  ID,
  IntakeForm,
  LanguageCode,
  Notification,
  PermissionMatrix,
  PublicAlertStatus,
  PublishState,
  Referral,
  ResourceItem,
  RosterEntry,
  ScreeningForm,
  SearchResult,
  SelfAssessmentResult,
  SessionMode,
  SessionNote,
  Settings,
  Slot,
  User,
  WaitlistRequest,
} from '../types'
import type { AvailabilityPattern, CounsellorAvailability } from '../domain/slots'
import type { RegisterBody } from './handlers/auth'
import { http } from './mockApi'

const ua = () => (typeof navigator === 'undefined' ? 'Unknown' : navigator.userAgent)
const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export type LoginResult = AuthSession | { mfaRequired: true; challengeId: string }

export const authApi = {
  login: (username: string, password: string) => data<LoginResult>(http.post('/auth/login', { username, password, userAgent: ua() })),
  mfa: (challengeId: string, otp: string) => data<AuthSession>(http.post('/auth/mfa', { challengeId, otp })),
  register: (body: RegisterBody) => data<{ challengeId: string; otpRequired: boolean }>(http.post('/auth/register', body)),
  verifyRegistration: (challengeId: string, otp: string) => data<AuthSession>(http.post('/auth/register/verify', { challengeId, otp, userAgent: ua() })),
  recover: (username: string) => data<{ challengeId: string }>(http.post('/auth/recover', { username })),
  resetPassword: (challengeId: string, otp: string, newPassword: string) => data(http.post('/auth/recover/reset', { challengeId, otp, newPassword })),
  logout: () => data(http.post('/auth/logout')),
  me: () => data<{ user: User; effectiveRoles: AuthSession['effectiveRoles'] }>(http.get('/auth/me')),
  devices: () => data<DeviceSession[]>(http.get('/auth/devices')),
  revokeDevice: (id: ID) => data(http.delete(`/auth/devices/${id}`)),
  setMfa: (enabled: boolean) => data<User>(http.patch('/auth/mfa', { enabled })),
  changePassword: (current: string, next: string) => data(http.post('/auth/password', { current, next })),
  setLanguage: (language: LanguageCode) => data<User>(http.patch('/auth/language', { language })),
}

export interface SearchParams {
  districtId?: string
  language?: CounsellingLanguage
  signLanguage?: boolean
}

export interface BookRequest {
  counsellorId: ID
  slotId: ID
  mode: SessionMode
  language: CounsellingLanguage
  consent: boolean
  details?: { fullName: string; phone: string; email?: string; dateOfBirth?: string; gender?: Beneficiary['gender']; districtId?: string }
  guardian?: Omit<GuardianConsent, 'id' | 'recordedAt'>
}

export const bookingApi = {
  counsellors: (p: SearchParams) => data<CounsellorSummary[]>(http.get('/counsellors', { params: p })),
  search: (p: SearchParams) => data<SearchResult>(http.get('/counsellors/search', { params: p })),
  counsellor: (id: ID) => data<{ counsellor: Counsellor; slots: Slot[] }>(http.get(`/counsellors/${id}`)),
  book: (body: BookRequest) => data<{ appointment: AppointmentView; session?: AuthSession }>(http.post('/appointments', { ...body, userAgent: ua() })),
  mine: () => data<AppointmentView[]>(http.get('/appointments/mine')),
  get: (id: ID) => data<AppointmentView>(http.get(`/appointments/${id}`)),
  cancel: (id: ID, confirmLate = false, reason?: string) => data<AppointmentView>(http.post(`/appointments/${id}/cancel`, { confirmLate, reason })),
  reschedule: (id: ID, slotId: ID) => data<AppointmentView>(http.post(`/appointments/${id}/reschedule`, { slotId })),
  join: (id: ID) => data<AppointmentView>(http.post(`/appointments/${id}/join`)),
  waitlist: (body: Pick<WaitlistRequest, 'contactName' | 'contactPhone' | 'districtId' | 'language' | 'kind'>) => data<WaitlistRequest>(http.post('/waitlist', body)),
  safeguarding: (contactPhone?: string) => data(http.post('/safeguarding', { contactPhone })),
}

export const beneficiaryApi = {
  profile: () => data<Beneficiary>(http.get('/me/profile')),
  updateProfile: (patch: Partial<Beneficiary>) => data<Beneficiary>(http.patch('/me/profile', patch)),
  withdrawConsent: (id: ID) => data<Beneficiary>(http.post(`/me/consents/${id}/withdraw`)),
  requestErasure: () => data<Beneficiary>(http.post('/me/erasure')),
  saveSelfAssessment: (body: Pick<SelfAssessmentResult, 'tool' | 'score' | 'bandKey'>) => data<SelfAssessmentResult>(http.post('/self-assessments', body)),
  selfAssessments: () => data<SelfAssessmentResult[]>(http.get('/self-assessments/mine')),
}

export const counsellorApi = {
  appointments: () => data<AppointmentView[]>(http.get('/counsellor/appointments')),
  accept: (id: ID) => data<AppointmentView>(http.post(`/appointments/${id}/accept`)),
  reject: (id: ID, reason?: string) => data<AppointmentView>(http.post(`/appointments/${id}/reject`, { reason })),
  complete: (id: ID) => data<AppointmentView>(http.post(`/appointments/${id}/complete`)),
  noShow: (id: ID) => data<AppointmentView>(http.post(`/appointments/${id}/no-show`)),
  reassign: (id: ID, counsellorId: ID) => data<AppointmentView>(http.post(`/appointments/${id}/reassign`, { counsellorId })),
  cancel: (id: ID, reason?: string) => data<AppointmentView>(http.post(`/appointments/${id}/cancel`, { reason })),
  availability: () => data<{ availability: CounsellorAvailability; slots: Slot[] }>(http.get('/counsellor/availability')),
  savePattern: (pattern: AvailabilityPattern[]) => data(http.put('/counsellor/availability', { pattern })),
  addSlot: (start: string, durationMin: number, modes: SessionMode[]) => data(http.post('/counsellor/slots', { start, durationMin, modes })),
  blockSlot: (id: ID, blocked: boolean) => data(http.post(`/counsellor/slots/${encodeURIComponent(id)}/block`, { blocked })),
  cases: () => data<ClientSummary[]>(http.get('/counsellor/cases')),
  createCase: (body: { fullName: string; phone?: string; dateOfBirth?: string; gender?: Beneficiary['gender']; dsDivisionId?: string; counsellingLanguage?: CounsellingLanguage }) =>
    data<ClientSummary>(http.post('/counsellor/cases', body)),
  directory: () => data<Counsellor[]>(http.get('/counsellors-directory')),
}

export const casesApi = {
  get: (id: ID) => data<CaseDetail>(http.get(`/cases/${id}`)),
  saveScreening: (id: ID, form: ScreeningForm) => data<CaseRecord>(http.put(`/cases/${id}/screening`, form)),
  saveIntake: (id: ID, form: IntakeForm) => data<CaseRecord>(http.put(`/cases/${id}/intake`, form)),
  addAssessment: (id: ID, form: Omit<AssessmentForm, 'id'>) => data<CaseRecord>(http.post(`/cases/${id}/assessments`, form)),
  updateAssessment: (id: ID, form: AssessmentForm) => data<CaseRecord>(http.put(`/cases/${id}/assessments/${form.id}`, form)),
  addNote: (id: ID, note: Omit<SessionNote, 'id' | 'authorId'>) => data<CaseRecord>(http.post(`/cases/${id}/notes`, note)),
  patch: (id: ID, patch: Partial<Pick<CaseRecord, 'status' | 'primaryCategory'>>) => data<CaseRecord>(http.patch(`/cases/${id}`, patch)),
  addFollowUp: (id: ID, body: Pick<FollowUp, 'title' | 'dueDate'>) => data<CaseRecord>(http.post(`/cases/${id}/followups`, body)),
  setFollowUp: (id: ID, fid: ID, status: FollowUp['status']) => data<CaseRecord>(http.patch(`/cases/${id}/followups/${fid}`, { status })),
}

export type ReferralView = Referral & { caseId?: ID; clientCode?: string; clientName?: string; pendingRegistration: boolean }

export const referralsApi = {
  list: () => data<ReferralView[]>(http.get('/referrals')),
  create: (body: Omit<Referral, 'id' | 'status' | 'actions' | 'enteredByUserId' | 'createdAt'> & { createPending?: boolean }) => data<Referral>(http.post('/referrals', body)),
  update: (id: ID, patch: { status?: Referral['status']; action?: string; beneficiaryId?: ID; counsellorId?: ID }) => data<Referral>(http.patch(`/referrals/${id}`, patch)),
  searchBeneficiaries: (q: { name?: string; phone?: string; dateOfBirth?: string }) => data<BeneficiaryMatch[]>(http.get('/beneficiaries/search', { params: q })),
}

export const alertsApi = {
  raise: (body: { message?: string; contactPhone?: string; beneficiaryId?: ID }) => data<PublicAlertStatus>(http.post('/alerts', body)),
  status: (id: ID) => data<PublicAlertStatus>(http.get(`/alerts/${id}/status`)),
  tick: () => data<{ escalated: number }>(http.post('/alerts/tick')),
  list: () => data<AlertView[]>(http.get('/alerts')),
  ack: (id: ID) => data<AlertView>(http.post(`/alerts/${id}/ack`)),
  escalate: (id: ID, note?: string) => data<AlertView>(http.post(`/alerts/${id}/escalate`, { note })),
  outcome: (id: ID, outcome: Omit<AlertOutcome, 'recordedAt' | 'recordedByUserId'>) => data<AlertView>(http.post(`/alerts/${id}/outcome`, outcome)),
  handover: () => data<Handover | null>(http.get('/alerts/handover')),
  ackHandover: (id: ID) => data<Handover>(http.post(`/alerts/handover/${id}/ack`)),
}

export const adminApi = {
  users: () => data<User[]>(http.get('/admin/users')),
  createUser: (body: Pick<User, 'username' | 'displayName' | 'roles' | 'preferredLanguage' | 'counsellorId'>) => data<User>(http.post('/admin/users', body)),
  updateUser: (id: ID, patch: Partial<User>) => data<User>(http.patch(`/admin/users/${id}`, patch)),
  beneficiaries: () =>
    data<Array<Pick<Beneficiary, 'id' | 'clientCode' | 'fullName' | 'districtId' | 'pendingRegistration' | 'erasureRequestedAt' | 'createdAt'>>>(http.get('/admin/beneficiaries')),
  counsellors: () => data<Counsellor[]>(http.get('/admin/counsellors')),
  createCounsellor: (body: Omit<Counsellor, 'id'>) => data<Counsellor>(http.post('/admin/counsellors', body)),
  updateCounsellor: (id: ID, patch: Partial<Counsellor>) => data<Counsellor>(http.patch(`/admin/counsellors/${id}`, patch)),
  permissions: () => data<PermissionMatrix>(http.get('/admin/permissions')),
  savePermissions: (matrix: PermissionMatrix) => data<PermissionMatrix>(http.put('/admin/permissions', { matrix })),
  resetPermissions: () => data<PermissionMatrix>(http.put('/admin/permissions', { reset: true })),
  resources: () => data<ResourceItem[]>(http.get('/admin/resources')),
  createResource: (body: Omit<ResourceItem, 'id' | 'state' | 'updatedAt'>) => data<ResourceItem>(http.post('/admin/resources', body)),
  updateResource: (id: ID, body: Partial<ResourceItem>) => data<ResourceItem>(http.put(`/admin/resources/${id}`, body)),
  setResourceState: (id: ID, state: PublishState) => data<ResourceItem>(http.post(`/admin/resources/${id}/state`, { state })),
  deleteResource: (id: ID) => data(http.delete(`/admin/resources/${id}`)),
  roster: () => data<{ roster: RosterEntry[]; officers: Array<{ id: ID; name: string }>; handovers: Handover[] }>(http.get('/admin/roster')),
  setRoster: (weekStart: string, body: Pick<RosterEntry, 'officerUserId' | 'backupUserId'>) => data<RosterEntry>(http.put(`/admin/roster/${weekStart}`, body)),
  groups: () => data<GroupSessionView[]>(http.get('/groups')),
  createGroup: (body: Omit<GroupSession, 'id' | 'enrolledBeneficiaryIds' | 'attendance'>) => data<GroupSessionView>(http.post('/groups', body)),
  updateGroup: (id: ID, op: { enrol?: ID; remove?: ID; attendance?: { beneficiaryId: ID; attended: boolean } }) => data<GroupSessionView>(http.patch(`/groups/${id}`, op)),
  audit: (q: { userId?: string; type?: string; from?: string; to?: string; target?: string }) => data<Array<AuditEntry & { actorName?: string }>>(http.get('/admin/audit', { params: q })),
  waitlist: () => data<WaitlistRequest[]>(http.get('/admin/waitlist')),
  setWaitlist: (id: ID, status: WaitlistRequest['status']) => data<WaitlistRequest>(http.patch(`/admin/waitlist/${id}`, { status })),
}

export const contentApi = {
  resources: () => data<ResourceItem[]>(http.get('/resources')),
  resource: (id: ID) => data<ResourceItem>(http.get(`/resources/${id}`)),
}

export const settingsApi = {
  get: () => data<Settings>(http.get('/settings')),
  save: (patch: Partial<Settings>) => data<Settings>(http.put('/settings', patch)),
}

export const notificationsApi = {
  list: () => data<Notification[]>(http.get('/notifications')),
  read: (id: ID) => data(http.post(`/notifications/${id}/read`)),
  readAll: () => data(http.post('/notifications/read-all')),
}

export interface StatQuery {
  districtId?: string
  gender?: 'male' | 'female'
  ageGroup?: string
  from?: string
  to?: string
}

export interface DashboardData {
  refreshedAt: string
  kpis: { individual: number; group: number; groupParticipants: number; awareness: number; openAlerts: number; activeCounsellors: number }
  byDivision: Array<{ id: string; total: number } & Record<string, number | string>>
  byMonth: Array<{ month: string; individual: number; group: number; awareness: number }>
  byGender: Record<string, number>
  byAgeGroup: Record<string, number>
  byCategory: Record<string, number>
  awarenessByCategory: Record<string, number>
  divisionLevel: 'ds' | 'district'
}

export type ReportRow = Record<string, string | number | null>

export const reportsApi = {
  dashboard: (q: StatQuery) => data<DashboardData>(http.get('/reports/dashboard', { params: q })),
  monthly: (month: string, districtId: string) => data<{ month: string; districtId: string; rows: ReportRow[] }>(http.get('/reports/monthly', { params: { month, districtId } })),
  management: (q: StatQuery) => data<{ rows: ReportRow[] }>(http.get('/reports/management', { params: q })),
  operational: (q: StatQuery) => data<{ rows: ReportRow[] }>(http.get('/reports/operational', { params: q })),
  groups: (q: StatQuery) => data<{ rows: ReportRow[] }>(http.get('/reports/groups', { params: q })),
  emergency: (q: StatQuery) =>
    data<{
      identityVisible: boolean
      summary: { total: number; open: number; escalated: number; avgAckMinutes: number | null; outcomes: Record<string, number> }
      rows: ReportRow[]
    }>(http.get('/reports/emergency', { params: q })),
}
