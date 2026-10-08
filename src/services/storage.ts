import type {
  Alert,
  Appointment,
  AuditEntry,
  Beneficiary,
  CaseRecord,
  Counsellor,
  DeviceSession,
  GroupSession,
  Handover,
  MockCredential,
  Notification,
  PermissionMatrix,
  Referral,
  ResourceItem,
  RosterEntry,
  SelfAssessmentResult,
  Settings,
  User,
  WaitlistRequest,
} from '../types'
import type { CounsellorAvailability } from '../domain/slots'
import { buildSeed } from '../data/seed'

/** Everything the mock backend persists. Each collection is its own localStorage key. */
export interface DB {
  users: User[]
  credentials: MockCredential[]
  devices: DeviceSession[]
  beneficiaries: Beneficiary[]
  counsellors: Counsellor[]
  availability: CounsellorAvailability[]
  appointments: Appointment[]
  waitlist: WaitlistRequest[]
  groups: GroupSession[]
  cases: CaseRecord[]
  referrals: Referral[]
  selfAssessments: SelfAssessmentResult[]
  alerts: Alert[]
  roster: RosterEntry[]
  handovers: Handover[]
  resources: ResourceItem[]
  settings: Settings
  permissions: PermissionMatrix
  audit: AuditEntry[]
  notifications: Notification[]
}

export const STORAGE_PREFIX = 'careme:v1:'
const META_KEY = `${STORAGE_PREFIX}meta`

const KEYS: (keyof DB)[] = [
  'users',
  'credentials',
  'devices',
  'beneficiaries',
  'counsellors',
  'availability',
  'appointments',
  'waitlist',
  'groups',
  'cases',
  'referrals',
  'selfAssessments',
  'alerts',
  'roster',
  'handovers',
  'resources',
  'settings',
  'permissions',
  'audit',
  'notifications',
]

/** In-memory copy; also the fallback when localStorage is unavailable (private mode, blocked storage). */
let cache: Partial<DB> = {}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage full or blocked: the in-memory cache still works for this tab.
  }
}

function seedAll(now: Date): void {
  const seed = buildSeed(now)
  cache = { ...seed }
  for (const key of KEYS) safeSet(STORAGE_PREFIX + key, JSON.stringify(seed[key]))
  safeSet(META_KEY, JSON.stringify({ seededAt: now.toISOString(), version: 1 }))
}

/** Seed demo data on first run. Safe to call repeatedly. */
export function ensureSeeded(now: Date = new Date()): void {
  if (Object.keys(cache).length === KEYS.length) return
  if (!safeGet(META_KEY)) {
    seedAll(now)
    return
  }
  for (const key of KEYS) {
    const raw = safeGet(STORAGE_PREFIX + key)
    if (raw === null) {
      seedAll(now)
      return
    }
    ;(cache as Record<string, unknown>)[key] = JSON.parse(raw)
  }
}

export const db = {
  get<K extends keyof DB>(key: K): DB[K] {
    ensureSeeded()
    return cache[key] as DB[K]
  },
  set<K extends keyof DB>(key: K, value: DB[K]): void {
    cache[key] = value
    safeSet(STORAGE_PREFIX + key, JSON.stringify(value))
  },
  update<K extends keyof DB>(key: K, fn: (current: DB[K]) => DB[K]): DB[K] {
    const next = fn(db.get(key))
    db.set(key, next)
    return next
  },
}

/** Wipe every Care Me key and re-seed fresh demo data. */
export function resetDemoData(now: Date = new Date()): void {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key)
    sessionStorage.clear()
  } catch {
    // ignore
  }
  cache = {}
  seedAll(now)
}
