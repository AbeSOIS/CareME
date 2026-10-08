import type { Settings } from '../types'

/**
 * Placeholder values for every Administrator-configurable parameter (FR-080).
 * The bid leaves these "configurable by the Administrator"; confirm with the Ministry.
 */
export const DEFAULT_SETTINGS: Settings = {
  idleTimeoutMin: 15,
  idleWarningSec: 60,
  lockoutThreshold: 5,
  mfaRequiredRoles: ['admin'],
  otpRequiredForRegistration: true,
  escalationPeriodMin: 10,
  escalationPath: ['Backup Emergency Officer', 'Counselling Division Director', 'Ministry Administrator'],
  cancellationNoticeHours: 24,
  noShowAfterMin: 15,
  maxSessionsPerClient: 8,
  maxSessionDurationMin: 60,
  minorAgeThreshold: 18,
  groupDefaultCapacity: 12,
  groupMaxCapacity: 30,
  maxFileSizeMb: 10,
  allowedFileTypes: ['pdf', 'jpg', 'png', 'docx'],
  dashboardRefreshMin: 15,
}

/** Demo one-time password, shown on screen. A real build sends it via the Sri Lankan SMS gateway (INT-001). */
export const DEMO_OTP = '123456'

export const DEMO_PASSWORD = 'Demo@1234'

/** Emergency numbers shown on every beneficiary screen. Confirm with the Ministry. */
export const EMERGENCY_NUMBERS = [
  { key: 'police', number: '119' },
  { key: 'mentalHealthHelpline', number: '1926' },
  { key: 'ambulance', number: '1990' },
] as const
