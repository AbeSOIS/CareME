import { addDays, addMinutes, format, setHours, setMinutes, startOfHour, subDays } from 'date-fns'
import { DEFAULT_SETTINGS, DEMO_PASSWORD } from '../config/defaults'
import { weekStartOf } from '../domain/alerts'
import { clientCode } from '../domain/ids'
import { DEFAULT_PERMISSIONS } from '../domain/permissions'
import { createRng } from '../domain/rng'
import { slotId, type AvailabilityPattern, type CounsellorAvailability } from '../domain/slots'
import type { DB } from '../services/storage'
import type {
  Alert,
  Appointment,
  AppointmentStatus,
  AuditEntry,
  Beneficiary,
  CaseRecord,
  Counsellor,
  CounsellingLanguage,
  GroupSession,
  ID,
  IntakeForm,
  NotificationPreferences,
  ProblemFrequency,
  Referral,
  ResourceItem,
  RosterEntry,
  ScreeningForm,
  SessionCategory,
  SessionMode,
  User,
} from '../types'
import districts from './districts.json'
import dsDivisions from './dsDivisions.json'
import resourcesJson from './resources.json'

/**
 * Builds the complete demo database. ALL people, cases and contact details are
 * fabricated. Times are relative to `now` so the demo always has upcoming slots.
 */

const SINHALA_F = ['Nimesha', 'Kumudini', 'Chathurika', 'Ishara', 'Hasini', 'Madhavi', 'Thilini', 'Anusha', 'Iresha', 'Lakmini', 'Sachini', 'Dulani']
const SINHALA_M = ['Chaminda', 'Kasun', 'Nuwan', 'Saman', 'Tharindu', 'Lahiru', 'Asanka', 'Mahesh', 'Dinesh', 'Ruchira', 'Sampath']
const SINHALA_S = ['Perera', 'Fernando', 'Silva', 'Jayasinghe', 'Wickramasinghe', 'Bandara', 'Herath', 'Rathnayake', 'Gunawardena', 'Dissanayake', 'Senanayake', 'Karunaratne', 'Wijesinghe', 'Abeysekara']
const TAMIL_F = ['Kavitha', 'Nirosha', 'Sharmila', 'Yalini', 'Priya', 'Thusyanthi', 'Mathuri', 'Keerthana', 'Vanaja']
const TAMIL_M = ['Suresh', 'Kajan', 'Vithurshan', 'Thayalan', 'Sivakumar', 'Niroshan', 'Ramesh', 'Gajan']
const TAMIL_S = ['Sivanathan', 'Kanagaratnam', 'Thurairajah', 'Rajendran', 'Balasingham', 'Nadarajah', 'Yogarajah', 'Arumugam']
const MUSLIM_F = ['Fathima', 'Rizna', 'Sumaiya', 'Nusra']
const MUSLIM_M = ['Rizwan', 'Imran', 'Farhan', 'Nazeer']
const MUSLIM_S = ['Mohamed', 'Hameed', 'Rasheed', 'Ismail']

const TAMIL_MAJORITY = new Set(['jaffna', 'kilinochchi', 'mannar', 'batticaloa'])
const MIXED = new Set(['trincomalee', 'ampara', 'nuwaraeliya', 'puttalam', 'colombo'])
/** Pre-bid Q&A: no counsellor coverage in Vavuniya and Mullaitivu. */
const NO_COVERAGE = new Set(['vavuniya', 'mullaitivu'])
const EXTRA_COUNSELLORS: Record<string, number> = { colombo: 3, gampaha: 2, kandy: 2, kurunegala: 2, galle: 1, jaffna: 1 }

const KALUTARA_DS = ['horana', 'ingiriya', 'walallawita', 'beruwala', 'palindanuwara', 'bulathsinhala', 'bandaragama']

const FOCUS = [
  'family and relationship concerns',
  'stress and anxiety',
  'low mood',
  'young people and students',
  'alcohol and drug use',
  'grief and loss',
  'financial and work stress',
]

const QUALIFICATIONS = ['Diploma in Counselling', 'BA in Psychology', 'Higher Diploma in Counselling Psychology', 'MSc in Counselling', 'Certificate in Psychosocial Support']

const TIMES = ['09:00', '10:30', '13:30', '15:00']

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: { appointmentReminder: true, appointmentChange: true, resourceUpdates: false, generalNotices: true },
  channels: { sms: true, email: false, push: true },
  minimalContent: true,
}

const iso = (d: Date) => d.toISOString()
const day = (d: Date) => format(d, 'yyyy-MM-dd')

export function buildSeed(now: Date): DB {
  const rng = createRng(20260108)
  const at = (h: number, m: number, offsetDays: number) => setMinutes(setHours(addDays(now, offsetDays), h), m)

  /* ---------------- Counsellors ---------------- */

  const counsellors: Counsellor[] = []
  const availability: CounsellorAvailability[] = []

  const fixed: Array<Omit<Counsellor, 'id'> & { id: ID }> = [
    {
      id: 'c001',
      fullName: 'Dilini Perera',
      gender: 'female',
      districtId: 'kalutara',
      dsDivisionId: 'horana',
      languages: ['si', 'en'],
      signLanguage: false,
      remoteAllowed: true,
      active: true,
      bio: 'Counselling in Sinhala and English. Works with families, young people, and people under stress, with nine years supporting clients across the Horana area through workplace pressure, exam anxiety, and family conflict.',
      qualifications: ['MSc in Counselling', 'Diploma in Counselling', 'Certificate in Trauma-Informed Care', 'Certificate in Cognitive Behavioural Techniques'],
    },
    {
      id: 'c002',
      fullName: 'Tharshini Selvarajah',
      gender: 'female',
      districtId: 'kalutara',
      dsDivisionId: 'beruwala',
      languages: ['ta', 'si', 'en'],
      signLanguage: false,
      remoteAllowed: true,
      active: true,
      bio: 'Counselling in Tamil, Sinhala and English. Focus on family concerns and alcohol and drug use.',
      qualifications: ['BA in Psychology', 'Higher Diploma in Counselling Psychology'],
    },
    {
      id: 'c003',
      fullName: 'Ruwan Jayasinghe',
      gender: 'male',
      districtId: 'kalutara',
      dsDivisionId: 'ingiriya',
      languages: ['si', 'sign'],
      signLanguage: true,
      remoteAllowed: true,
      active: true,
      bio: 'Counselling in Sinhala and Sri Lankan Sign Language. Works with people with disabilities and their families.',
      qualifications: ['Diploma in Counselling', 'Certificate in Sign Language Interpretation'],
    },
  ]

  let seq = 4
  for (const d of districts) {
    if (NO_COVERAGE.has(d.id)) continue
    const target = 7 + (EXTRA_COUNSELLORS[d.id] ?? 0) + (d.id === 'kalutara' ? 2 : 0)
    const existing = fixed.filter((f) => f.districtId === d.id)
    counsellors.push(...existing)
    for (let i = existing.length; i < target; i++) {
      const tamilArea = TAMIL_MAJORITY.has(d.id)
      const mixed = MIXED.has(d.id)
      const roll = rng.next()
      const profile = tamilArea ? (roll < 0.85 ? 'tamil' : 'muslim') : mixed ? (roll < 0.45 ? 'tamil' : roll < 0.6 ? 'muslim' : 'sinhala') : roll < 0.88 ? 'sinhala' : roll < 0.95 ? 'tamil' : 'muslim'
      const gender = rng.chance(0.62) ? 'female' : 'male'
      const [first, last] =
        profile === 'tamil'
          ? [rng.pick(gender === 'female' ? TAMIL_F : TAMIL_M), rng.pick(TAMIL_S)]
          : profile === 'muslim'
            ? [rng.pick(gender === 'female' ? MUSLIM_F : MUSLIM_M), rng.pick(MUSLIM_S)]
            : [rng.pick(gender === 'female' ? SINHALA_F : SINHALA_M), rng.pick(SINHALA_S)]
      const languages: CounsellingLanguage[] =
        profile === 'sinhala' ? ['si'] : profile === 'tamil' ? ['ta'] : rng.chance(0.5) ? ['ta', 'si'] : ['si', 'ta']
      if (profile === 'sinhala' && rng.chance(0.12)) languages.push('ta')
      if (rng.chance(0.4)) languages.push('en')
      const signLanguage = rng.chance(0.06)
      if (signLanguage) languages.push('sign')
      const focus = rng.pick(FOCUS)
      counsellors.push({
        id: `c${String(seq++).padStart(3, '0')}`,
        fullName: `${first} ${last}`,
        gender,
        districtId: d.id,
        dsDivisionId: d.id === 'kalutara' ? rng.pick(KALUTARA_DS) : undefined,
        languages,
        signLanguage,
        remoteAllowed: rng.chance(0.4),
        active: rng.chance(0.96),
        bio: `Experienced in ${focus}.`,
        qualifications: [rng.pick(QUALIFICATIONS)],
      })
    }
  }

  for (const c of counsellors) {
    const pattern: AvailabilityPattern[] = []
    const workDays = [1, 2, 3, 4, 5].filter(() => rng.chance(0.6))
    if (!workDays.length) workDays.push(rng.int(1, 5))
    for (const weekday of workDays) {
      const times = TIMES.filter(() => rng.chance(0.5))
      if (!times.length) times.push(rng.pick(TIMES))
      for (const time of times) {
        const modes: SessionMode[] = ['video', 'audio']
        if (rng.chance(0.6)) modes.push('chat')
        pattern.push({ weekday, time, durationMin: rng.chance(0.8) ? 60 : 45, modes })
      }
    }
    availability.push({ counsellorId: c.id, pattern, blocked: [], extra: [] })
  }
  // Demo counsellors get a predictable weekday pattern.
  for (const id of ['c001', 'c002', 'c003']) {
    const a = availability.find((x) => x.counsellorId === id)!
    a.pattern = [1, 2, 3, 4, 5].flatMap((weekday) =>
      ['09:00', '11:00', '14:00'].map((time) => ({ weekday, time, durationMin: 60, modes: ['video', 'audio', 'chat'] as SessionMode[] })),
    )
  }

  /* ---------------- Beneficiaries (PII, fabricated) ---------------- */

  const beneficiaries: Beneficiary[] = []
  let codeSeq = 1
  const addBeneficiary = (b: Partial<Beneficiary> & Pick<Beneficiary, 'id' | 'fullName' | 'gender'>): Beneficiary => {
    const full: Beneficiary = {
      clientCode: clientCode('KLT', 2026, codeSeq++),
      preferredLanguage: 'si',
      counsellingLanguage: 'si',
      notificationPrefs: DEFAULT_PREFS,
      consents: [
        { id: `cons_${b.id}`, purpose: 'counselling', givenAt: iso(subDays(now, 60)), wordingVersion: 'draft-0.1' },
        { id: `consd_${b.id}`, purpose: 'dataProcessing', givenAt: iso(subDays(now, 60)), wordingVersion: 'draft-0.1' },
      ],
      pendingRegistration: false,
      createdAt: iso(subDays(now, 60)),
      districtId: 'kalutara',
      ...b,
    }
    beneficiaries.push(full)
    return full
  }

  addBeneficiary({ id: 'b001', fullName: 'Nimali Wijesekara', preferredName: 'Nimali', gender: 'female', dateOfBirth: '1994-03-12', phone: '0770000101', email: 'nimali@example.lk', dsDivisionId: 'horana' })
  addBeneficiary({ id: 'b002', fullName: 'Sanduni Rajapaksha', preferredName: 'Sanduni', gender: 'female', dateOfBirth: '1988-11-02', phone: '0770000102', email: 'sanduni@example.lk', dsDivisionId: 'ingiriya' })
  addBeneficiary({
    id: 'b003',
    fullName: 'Kavindu Fernando',
    preferredName: 'Kavindu',
    gender: 'male',
    dateOfBirth: day(subDays(now, 365 * 16 + 40)),
    phone: '0770000103',
    dsDivisionId: 'bandaragama',
    guardianConsent: {
      id: 'gc_b003',
      guardianName: 'Malani Fernando',
      relationship: 'mother',
      guardianContact: '0770000203',
      authorityConfirmation: 'selfDeclared',
      consentGiven: true,
      recordedAt: iso(subDays(now, 30)),
    },
  })
  addBeneficiary({ id: 'b004', fullName: 'Pradeepa Kumari', gender: 'female', dateOfBirth: '1979-07-21', phone: '0770000104', dsDivisionId: 'horana' })
  addBeneficiary({ id: 'b005', fullName: 'Asela Gunasekara', gender: 'male', dateOfBirth: '1990-01-15', phone: '0770000105', dsDivisionId: 'walallawita' })
  addBeneficiary({ id: 'b006', fullName: 'Dhanushka Silva', gender: 'male', dateOfBirth: '1985-05-30', phone: '0770000106', dsDivisionId: 'bulathsinhala' })
  addBeneficiary({ id: 'b007', fullName: 'Chamari Herath', gender: 'female', dateOfBirth: '2001-09-09', phone: '0770000107', dsDivisionId: 'palindanuwara' })
  addBeneficiary({ id: 'b008', fullName: 'Lakshmi Nadarajah', gender: 'female', dateOfBirth: '1983-12-03', phone: '0770000108', preferredLanguage: 'ta', counsellingLanguage: 'ta', dsDivisionId: 'beruwala' })
  addBeneficiary({ id: 'b009', fullName: 'Mohamed Rizwan', gender: 'male', dateOfBirth: '1992-04-18', phone: '0770000109', preferredLanguage: 'ta', counsellingLanguage: 'ta', dsDivisionId: 'beruwala' })
  addBeneficiary({ id: 'b010', fullName: 'Kumaran Sivanathan', gender: 'male', dateOfBirth: '1975-02-27', phone: '0770000110', preferredLanguage: 'ta', counsellingLanguage: 'ta', dsDivisionId: 'beruwala' })
  addBeneficiary({
    id: 'b011',
    fullName: 'Pradeep Kumara',
    gender: 'male',
    phone: '0770000111',
    dsDivisionId: 'ingiriya',
    pendingRegistration: true,
    consents: [],
  })
  for (let i = 12; i <= 24; i++) {
    const female = rng.chance(0.65)
    addBeneficiary({
      id: `b${String(i).padStart(3, '0')}`,
      fullName: `${rng.pick(female ? SINHALA_F : SINHALA_M)} ${rng.pick(SINHALA_S)}`,
      gender: female ? 'female' : 'male',
      dateOfBirth: `${rng.int(1960, 2004)}-0${rng.int(1, 9)}-1${rng.int(0, 9)}`,
      phone: `07700001${String(i).padStart(2, '0')}`,
      dsDivisionId: rng.pick(KALUTARA_DS),
    })
  }

  /* ---------------- Users ---------------- */

  const users: User[] = [
    mkUser('u_ben1', 'nimali@example.lk', 'Nimali', ['beneficiary'], { beneficiaryId: 'b001' }),
    mkUser('u_ben2', 'sanduni@example.lk', 'Sanduni', ['beneficiary'], { beneficiaryId: 'b002' }),
    mkUser('u_ben3', '0770000103', 'Kavindu', ['beneficiary'], { beneficiaryId: 'b003' }),
    mkUser('u_c1', 'dilini@careme.gov.lk', 'Dilini Perera', ['counsellor'], { counsellorId: 'c001' }),
    mkUser('u_c2', 'tharshini@careme.gov.lk', 'Tharshini Selvarajah', ['counsellor'], { counsellorId: 'c002', preferredLanguage: 'ta' }),
    mkUser('u_c3', 'ruwan@careme.gov.lk', 'Ruwan Jayasinghe', ['counsellor'], { counsellorId: 'c003' }),
    mkUser('u_admin', 'admin@careme.gov.lk', 'Chaminda Bandara', ['admin'], { preferredLanguage: 'en' }),
    mkUser('u_analyst', 'analyst@careme.gov.lk', 'Ishara Herath', ['analyst'], { preferredLanguage: 'en' }),
  ]
  function mkUser(id: ID, username: string, displayName: string, roles: User['roles'], extra: Partial<User> = {}): User {
    return {
      id,
      username,
      displayName,
      roles,
      status: 'active',
      preferredLanguage: 'si',
      mfaEnabled: false,
      failedLoginCount: 0,
      createdAt: iso(subDays(now, 90)),
      ...extra,
    }
  }

  /* ---------------- Appointments ---------------- */

  const appointments: Appointment[] = []
  const bookedSlot = (counsellorId: ID, start: Date, modes: SessionMode[] = ['video', 'audio', 'chat']) => {
    const id = slotId(counsellorId, start)
    const avail = availability.find((a) => a.counsellorId === counsellorId)!
    if (!avail.extra.some((s) => s.id === id)) avail.extra.push({ id, counsellorId, start: iso(start), durationMin: 60, modes, blocked: false })
    return id
  }
  let aptSeq = 1
  const addApt = (beneficiaryId: ID, counsellorId: ID, start: Date, status: AppointmentStatus, sessionNumber: number, mode: SessionMode = 'video', language: CounsellingLanguage = 'si') => {
    const id = `apt_${String(aptSeq++).padStart(3, '0')}`
    const sid = bookedSlot(counsellorId, start)
    const created = subDays(start, 5)
    appointments.push({
      id,
      beneficiaryId,
      counsellorId,
      slotId: sid,
      start: iso(start),
      durationMin: 60,
      mode,
      language,
      status,
      sessionNumber,
      joinedAt: status === 'completed' ? iso(addMinutes(start, 1)) : undefined,
      history: [
        { at: iso(created), type: 'requested' },
        ...(status !== 'requested' ? [{ at: iso(addMinutes(created, 90)), type: 'accepted' as const, byUserId: 'u_c1' }] : []),
        ...(status === 'completed' ? [{ at: iso(addMinutes(start, 60)), type: 'completed' as const }] : []),
      ],
      createdAt: iso(created),
    })
    return id
  }

  // Nimali: 3 completed, one starting in a few minutes (join demo), one inside 24h (late-cancel demo), one request.
  addApt('b001', 'c001', at(9, 0, -35), 'completed', 1)
  addApt('b001', 'c001', at(9, 0, -21), 'completed', 2)
  addApt('b001', 'c001', at(9, 0, -7), 'completed', 3)
  // Starts 5–10 minutes from now so the join window (opens 10 min early) is live straight away.
  const soon = new Date(Math.ceil(now.getTime() / 300_000) * 300_000 + 300_000)
  addApt('b001', 'c001', soon, 'confirmed', 4)
  addApt('b001', 'c001', addMinutes(startOfHour(now), 60 * 20), 'confirmed', 5, 'audio')
  addApt('b001', 'c001', at(14, 0, 4), 'requested', 6)
  // Sanduni: 7 completed + 1 upcoming = 8 (session cap demo).
  for (let i = 0; i < 7; i++) addApt('b002', 'c001', at(11, 0, -70 + i * 9), 'completed', i + 1)
  addApt('b002', 'c001', at(11, 0, 3), 'confirmed', 8)
  // Kavindu (minor): 1 completed with guardian consent.
  addApt('b003', 'c001', at(14, 0, -10), 'completed', 1)
  // Other clients.
  addApt('b004', 'c001', at(9, 0, -14), 'completed', 1)
  addApt('b004', 'c001', at(9, 0, 6), 'confirmed', 2)
  addApt('b005', 'c001', at(11, 0, 2), 'requested', 1, 'audio')
  addApt('b006', 'c001', at(14, 0, -3), 'noShow', 1)
  addApt('b007', 'c001', at(11, 0, -5), 'cancelled', 1)
  // More of Dilini's caseload: a steady long-running client, a brand-new one, a nearly
  // finished course, and a client seen yesterday.
  addApt('b012', 'c001', at(10, 0, -28), 'completed', 1)
  addApt('b012', 'c001', at(10, 0, -14), 'completed', 2)
  addApt('b012', 'c001', at(10, 0, 5), 'confirmed', 3)
  addApt('b013', 'c001', at(13, 0, -4), 'completed', 1)
  addApt('b013', 'c001', at(13, 0, 8), 'requested', 2)
  addApt('b014', 'c001', at(15, 0, -56), 'completed', 1)
  addApt('b014', 'c001', at(15, 0, -42), 'completed', 2)
  addApt('b014', 'c001', at(15, 0, -28), 'completed', 3)
  addApt('b014', 'c001', at(15, 0, -14), 'completed', 4)
  addApt('b015', 'c001', at(16, 0, -1), 'completed', 1)
  // Two more for today specifically, so the dashboard's "Today" list has more than one line.
  addApt('b016', 'c001', at(8, 30, 0), 'completed', 1)
  addApt('b017', 'c001', at(17, 0, 0), 'confirmed', 1)
  addApt('b008', 'c002', at(9, 0, -12), 'completed', 1, 'video', 'ta')
  addApt('b008', 'c002', at(9, 0, 2), 'confirmed', 2, 'video', 'ta')
  addApt('b009', 'c002', at(11, 0, -6), 'completed', 1, 'audio', 'ta')
  addApt('b010', 'c002', at(14, 0, 1), 'requested', 1, 'video', 'ta')

  /* ---------------- Cases (clinical, fabricated) ---------------- */

  const freq = (vals: number[]): Record<string, ProblemFrequency> => {
    const scale: ProblemFrequency[] = ['notAtAll', 'rarely', 'sometimes', 'often']
    return Object.fromEntries(vals.map((v, i) => [String(i + 1), scale[v]]))
  }
  const rekey = (rec: Record<string, ProblemFrequency>, prefix: string) =>
    Object.fromEntries(Object.entries(rec).map(([k, v]) => [`${prefix}${k}`, v]))

  const screeningB001: ScreeningForm = {
    firstSessionLocation: 'Horana DS office (counselling room)',
    firstSessionDate: day(at(9, 0, -35)),
    counsellorName: 'Dilini Perera',
    sex: 'female',
    age: 32,
    dateOfBirth: '1994-03-12',
    province: 'Western',
    district: 'Kalutara',
    dsDivision: 'Horana',
    gnDivision: '',
    religion: 'buddhist',
    ethnicity: 'sinhalese',
    civilStatus: 'married',
    enoughMoneyForNecessities: 'rarely',
    mealsPerDay: 'three',
    attendsSchool: 'no',
    attendedSchoolPast: 'yes',
    yearsOfSchool: 13,
    highestEducation: 'alPassed',
    currentlyWorking: 'yes',
    currentJob: 'Garment factory supervisor',
    primaryOccupation: 'Supervisor',
    livingAlone: 'noWithHouse',
    livingWith: ['spouse', 'children'],
    advisedBy: ['health'],
    cameAlone: 'yes',
    presentingProblem: 'Ongoing stress at work and at home; difficulty sleeping for about three months.',
    referredTo: [],
    actions: ['providedInformation', 'intakeForCounselling'],
    comments: 'Agreed to weekly sessions.',
  }

  const intakeB001: IntakeForm = {
    sessionLocation: 'Remote (video)',
    date: day(at(9, 0, -21)),
    counsellorName: 'Dilini Perera',
    presentingProblem: 'Work pressure and conflict with spouse about finances.',
    additionalProblems: 'Poor sleep, low energy.',
    personalHistory: 'Eldest of three. Moved to Horana after marriage.',
    strengthsAndResources: 'Supportive sister; regular temple attendance.',
    familyStructure: 'Lives with spouse and two children (8 and 5).',
    socialSupport: 'Sister nearby; colleague she trusts.',
    barriersToCounselling: 'Shift work makes weekday sessions hard.',
    clientActions: 'Talked to supervisor about shifts.',
    overallHealth: 'fair',
    hasMedicalProblems: 'no',
    pastSubstanceProblem: 'no',
    currentAlcoholProblem: 'never',
    currentDrugProblem: 'never',
    ratings: [
      {
        id: 'pr1',
        kind: 'intake',
        date: day(at(9, 0, -21)),
        emotional: rekey(freq([2, 1, 0, 3, 1, 3, 1, 1, 2, 2]), 'e'),
        behavioural: rekey(freq([1, 0, 2, 1, 2, 1]), 'f'),
      },
      {
        id: 'pr2',
        kind: 'followUp',
        date: day(at(9, 0, -7)),
        emotional: rekey(freq([1, 1, 0, 2, 1, 2, 0, 1, 1, 1]), 'e'),
        behavioural: rekey(freq([1, 0, 1, 0, 1, 1]), 'f'),
      },
    ],
  }

  const cases: CaseRecord[] = [
    {
      id: 'case_b001',
      beneficiaryId: 'b001',
      counsellorId: 'c001',
      openedAt: iso(at(9, 0, -35)),
      status: 'open',
      primaryCategory: 'family',
      screening: screeningB001,
      intake: intakeB001,
      assessments: [
        {
          id: 'as1',
          date: day(at(9, 0, -21)),
          counsellorName: 'Dilini Perera',
          substanceUse: { a1: 'None', a6: 'No' },
          symptoms: { s1: 'sometimes', s2: 'rarely', s3: 'always', s4: 'rarely', s5: 'sometimes', s6: 'sometimes', s7: 'sometimes', s8: 'notAtAll', s9: 'always', s10: 'rarely' },
          functioning: {
            q11: { answer: 'yes', details: 'Tired after shifts.' },
            q12: { answer: 'yes', details: 'Difficulty concentrating.' },
            q13: { answer: 'yes', details: 'Arguments with spouse.' },
            q14: { answer: 'no', details: '' },
            q15: { answer: 'no', details: '' },
          },
        },
      ],
      notes: [
        noteFor('apt_001', at(9, 0, -35), 'family', 'Screening completed. Rapport built. Main stressors: work shifts and household finances.'),
        noteFor('apt_002', at(9, 0, -21), 'family', 'Intake completed. Introduced breathing exercise and sleep routine.'),
        noteFor('apt_003', at(9, 0, -7), 'family', 'Sleep slightly better. Practised problem-solving for shift schedule.'),
      ],
      followUps: [
        { id: 'fu1', title: 'Share sleep resource in Sinhala', dueDate: day(addDays(now, 2)), status: 'open', createdAt: iso(subDays(now, 7)) },
        { id: 'fu2', title: 'Confirm shift change with client', dueDate: day(subDays(now, 3)), status: 'done', createdAt: iso(subDays(now, 21)), closedAt: iso(subDays(now, 4)) },
      ],
      updatedAt: iso(subDays(now, 7)),
    },
    simpleCase('b002', 'c001', -70, 'mentalDisorder', 'Long-standing low mood; course nearly complete.'),
    simpleCase('b003', 'c001', -10, 'education', 'School-related stress. Parent present at first session.'),
    simpleCase('b004', 'c001', -14, 'economic', 'Referred by Base Hospital Horana after job loss.'),
    simpleCase('b005', 'c001', -2, 'relationship', 'New client — request pending.'),
    simpleCase('b006', 'c001', -3, 'drugRelated', 'Did not attend first appointment.'),
    simpleCase('b012', 'c001', -28, 'relationship', 'Marital conflict following a long separation for work abroad. Two sessions in, building trust.'),
    simpleCase('b013', 'c001', -4, 'mentalDisorder', 'New client referred by the family health worker for persistent low mood.'),
    simpleCase('b014', 'c001', -56, 'economic', 'Debt-related stress after a cooperative loan default. Four sessions completed; finishing the course.'),
    simpleCase('b015', 'c001', -1, 'education', 'Exam-related anxiety ahead of the A/L results. Single session so far.'),
    simpleCase('b016', 'c001', 0, 'mentalDisorder', 'Walk-in client seen this morning; first session, assessing general wellbeing.'),
    simpleCase('b017', 'c001', 0, 'relationship', 'Referred by a colleague; confirmed for a first session later today.'),
    simpleCase('b008', 'c002', -12, 'family', 'Family conflict after migration of spouse for work.'),
    simpleCase('b009', 'c002', -6, 'drugRelated', 'Concern about cannabis use; motivated to cut down.'),
    simpleCase('b010', 'c002', 1, 'mentalDisorder', 'New request.'),
  ]
  function noteFor(appointmentId: ID, date: Date, category: SessionCategory, note: string) {
    return { id: `note_${appointmentId}`, appointmentId, date: iso(date), mode: 'video' as const, durationMin: 55, category, note, authorId: 'u_c1' }
  }
  function simpleCase(beneficiaryId: ID, counsellorId: ID, openedOffset: number, category: SessionCategory, summary: string): CaseRecord {
    return {
      id: `case_${beneficiaryId}`,
      beneficiaryId,
      counsellorId,
      openedAt: iso(at(9, 0, openedOffset)),
      status: 'open',
      primaryCategory: category,
      assessments: [],
      notes:
        openedOffset <= 0
          ? [{ id: `note_${beneficiaryId}`, date: iso(at(9, 0, openedOffset)), mode: 'video', durationMin: 50, category, note: summary, authorId: counsellorId === 'c001' ? 'u_c1' : 'u_c2' }]
          : [],
      followUps: [],
      updatedAt: iso(at(9, 0, openedOffset)),
    }
  }

  /* ---------------- Referrals ---------------- */

  const referrals: Referral[] = [
    {
      id: 'ref_001',
      direction: 'inbound',
      source: 'hospital',
      sourceOrganisation: 'Base Hospital Horana — Medical Officer of Mental Health',
      referralDate: day(subDays(now, 16)),
      receivingDistrictId: 'kalutara',
      receivingDsDivisionId: 'horana',
      beneficiaryId: 'b004',
      contactName: 'Pradeepa Kumari',
      contactPhone: '0770000104',
      reason: 'Low mood after job loss; follow-up counselling requested.',
      urgency: 'priority',
      consentStatus: 'obtained',
      counsellorId: 'c001',
      status: 'accepted',
      actions: [{ at: iso(subDays(now, 15)), byUserId: 'u_c1', text: 'Contacted client and booked first session.' }],
      enteredByUserId: 'u_c1',
      createdAt: iso(subDays(now, 16)),
    },
    {
      id: 'ref_002',
      direction: 'inbound',
      source: 'gramaNiladhari',
      sourceOrganisation: 'Grama Niladhari, Ingiriya',
      referralDate: day(subDays(now, 2)),
      receivingDistrictId: 'kalutara',
      receivingDsDivisionId: 'ingiriya',
      beneficiaryId: 'b011',
      contactName: 'Pradeep Kumara',
      contactPhone: '0770000111',
      reason: 'Family reports withdrawal and heavy drinking since a bereavement.',
      urgency: 'routine',
      consentStatus: 'notObtained',
      counsellorId: 'c001',
      status: 'received',
      actions: [],
      enteredByUserId: 'u_admin',
      createdAt: iso(subDays(now, 2)),
    },
    {
      id: 'ref_003',
      direction: 'outbound',
      destination: 'Psychiatric clinic, Base Hospital Horana',
      referralDate: day(subDays(now, 7)),
      beneficiaryId: 'b002',
      reason: 'Assessment for medication review.',
      urgency: 'routine',
      consentStatus: 'obtained',
      counsellorId: 'c001',
      status: 'actioned',
      actions: [{ at: iso(subDays(now, 7)), byUserId: 'u_c1', text: 'Referral letter given to client.' }],
      enteredByUserId: 'u_c1',
      createdAt: iso(subDays(now, 7)),
    },
    {
      id: 'ref_004',
      direction: 'inbound',
      source: 'other',
      sourceOrganisation: 'Workplace counselling liaison, Horana garment zone',
      referralDate: day(now),
      receivingDistrictId: 'kalutara',
      receivingDsDivisionId: 'horana',
      beneficiaryId: 'b017',
      contactName: 'Supervisor on behalf of client',
      reason: 'Workplace conflict and stress; colleague suggested counselling.',
      urgency: 'routine',
      consentStatus: 'obtained',
      counsellorId: 'c001',
      status: 'received',
      actions: [],
      enteredByUserId: 'u_c1',
      createdAt: iso(now),
    },
  ]

  /* ---------------- Emergency roster, alerts, handovers ---------------- */

  const officers = ['u_c1', 'u_c2', 'u_c3']
  const roster: RosterEntry[] = []
  for (let w = -8; w <= 8; w++) {
    const weekStart = weekStartOf(addDays(now, w * 7))
    const idx = ((w % 3) + 3) % 3
    roster.push({ id: `ros_${weekStart}`, weekStart, officerUserId: officers[idx], backupUserId: officers[(idx + 1) % 3] })
  }

  const alerts: Alert[] = []
  const histOutcomes = ['safe', 'referred', 'ongoingSupport', 'safe', 'referred', 'safe'] as const
  for (let i = 0; i < 6; i++) {
    const raised = subDays(now, 20 + i * 27)
    const ackMin = [2, 4, 3, 12, 6, 5][i]
    const escalated = ackMin > DEFAULT_SETTINGS.escalationPeriodMin
    alerts.push({
      id: `al_h${i + 1}`,
      source: i % 3 === 0 ? 'anonymous' : i % 3 === 1 ? 'beneficiary' : 'counsellorRisk',
      beneficiaryId: i % 3 === 0 ? undefined : i % 2 ? 'b004' : 'b006',
      contactPhone: i % 3 === 0 ? '0779990000' : undefined,
      raisedAt: iso(raised),
      assignedOfficerUserId: officers[i % 3],
      acknowledgedAt: iso(addMinutes(raised, ackMin)),
      acknowledgedByUserId: officers[i % 3],
      escalations: escalated ? [{ at: iso(addMinutes(raised, 10)), level: 1, reason: 'timeout', to: DEFAULT_SETTINGS.escalationPath[0] }] : [],
      status: 'closed',
      outcome: {
        psychologicalFirstAid: true,
        individualCounselling: i % 2 === 0,
        referral: histOutcomes[i] === 'referred' ? 'hospital' : 'none',
        outcome: histOutcomes[i],
        summary: 'Contacted by phone; safety plan agreed.',
        recordedAt: iso(addMinutes(raised, 50)),
        recordedByUserId: officers[i % 3],
      },
    })
  }
  const currentOfficer = roster.find((r) => r.weekStart === weekStartOf(now))!.officerUserId
  alerts.push({
    id: 'al_open1',
    source: 'anonymous',
    contactPhone: '0779990011',
    message: 'I need to talk to someone now.',
    raisedAt: iso(addMinutes(now, -3)),
    assignedOfficerUserId: currentOfficer,
    escalations: [],
    status: 'open',
  })
  // A risk flag on one of Dilini's own clients, so her dashboard's risk-flagged list isn't empty.
  alerts.push({
    id: 'al_open2',
    source: 'counsellorRisk',
    beneficiaryId: 'b006',
    message: 'Missed first appointment and not answering calls. Raising as a welfare check.',
    raisedAt: iso(addMinutes(now, -45)),
    assignedOfficerUserId: currentOfficer,
    acknowledgedAt: iso(addMinutes(now, -40)),
    acknowledgedByUserId: currentOfficer,
    escalations: [],
    status: 'open',
  })

  /* ---------------- Group sessions ---------------- */

  const groupIds = beneficiaries.filter((b) => Number(b.id.slice(1)) >= 12).map((b) => b.id)
  const groups: GroupSession[] = [
    {
      id: 'grp_001',
      title: 'Managing stress together',
      counsellorId: 'c001',
      start: iso(at(10, 0, 4)),
      durationMin: 60,
      mode: 'video',
      capacity: 12,
      dsDivisionId: 'horana',
      category: 'mentalDisorder',
      enrolledBeneficiaryIds: ['b001', 'b004', 'b005', ...groupIds.slice(0, 3)],
      attendance: {},
    },
    {
      id: 'grp_002',
      title: 'Parenting support circle',
      counsellorId: 'c002',
      start: iso(at(15, 0, 6)),
      durationMin: 60,
      mode: 'inPerson',
      capacity: 12,
      dsDivisionId: 'beruwala',
      category: 'family',
      enrolledBeneficiaryIds: groupIds.slice(0, 11),
      attendance: {},
    },
    {
      id: 'grp_003',
      title: 'Mindfulness for daily life',
      counsellorId: 'c003',
      start: iso(at(10, 0, -12)),
      durationMin: 60,
      mode: 'inPerson',
      capacity: 15,
      dsDivisionId: 'ingiriya',
      category: 'mentalDisorder',
      enrolledBeneficiaryIds: groupIds.slice(3, 12),
      attendance: Object.fromEntries(groupIds.slice(3, 12).map((id, i) => [id, i % 4 !== 0])),
    },
  ]

  /* ---------------- Audit + resources ---------------- */

  const audit: AuditEntry[] = [
    { id: 'aud_1', at: iso(subDays(now, 2)), type: 'record.create', actorUserId: 'u_admin', target: 'referral:ref_002', detail: 'External referral entered (Grama Niladhari)' },
    { id: 'aud_2', at: iso(subDays(now, 1)), type: 'config.change', actorUserId: 'u_admin', target: 'settings', detail: 'Escalation period set to 10 minutes' },
    { id: 'aud_3', at: iso(addMinutes(now, -3)), type: 'alert.raised', target: 'alert:al_open1', detail: 'Anonymous alert' },
  ]

  const resources = (resourcesJson as unknown as ResourceItem[]).map((r) => ({
    ...r,
    updatedAt: iso(subDays(now, 30)),
    publishedAt: r.state === 'published' ? iso(subDays(now, 30)) : undefined,
  }))

  return {
    users,
    credentials: users.map((u) => ({ userId: u.id, password: DEMO_PASSWORD })),
    devices: [],
    beneficiaries,
    counsellors,
    availability,
    appointments,
    waitlist: [
      {
        id: 'wl_001',
        contactName: 'Anonymous caller',
        contactPhone: '0779990022',
        districtId: 'vavuniya',
        language: 'ta',
        kind: 'callback',
        status: 'open',
        createdAt: iso(subDays(now, 1)),
      },
    ],
    groups,
    cases,
    referrals,
    selfAssessments: [
      { id: 'sa_1', beneficiaryId: 'b001', tool: 'stress', score: 24, bandKey: 'moderateStress', completedAt: iso(subDays(now, 40)) },
      { id: 'sa_2', beneficiaryId: 'b001', tool: 'stress', score: 18, bandKey: 'moderateStress', completedAt: iso(subDays(now, 10)) },
    ],
    alerts,
    roster,
    handovers: [],
    resources,
    settings: DEFAULT_SETTINGS,
    permissions: DEFAULT_PERMISSIONS,
    audit,
    notifications: [
      { id: 'n_1', recipientRole: 'admin', messageKey: 'notif.waitlist', link: '/admin/waitlist', createdAt: iso(subDays(now, 1)) },
      { id: 'n_2', recipientUserId: 'u_c1', messageKey: 'notif.referralReceived', link: '/counsellor/referrals', createdAt: iso(subDays(now, 2)) },
    ],
  }
}

export const DISTRICTS = districts
export const DS_DIVISIONS = dsDivisions
