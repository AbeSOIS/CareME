import type { Gender, ID, ISODate, ISODateTime } from './common'
import type { SessionCategory, SessionMode } from './appointments'

/* ---------- Form A — Client Screening Form (MSSWLD, rev. 10 June 2015) ---------- */

export type FrequencyNRFA = 'never' | 'rarely' | 'frequently' | 'always'
export type YesNo = 'yes' | 'no'

export interface ScreeningForm {
  firstSessionLocation: string
  firstSessionDate: ISODate
  counsellorName: string
  // A. Demographic information
  sex: Extract<Gender, 'female' | 'male'> | ''
  age: number | null
  dateOfBirth?: ISODate
  province: string
  district: string
  dsDivision: string
  gnDivision?: string
  religion: 'buddhist' | 'christianRC' | 'hindu' | 'islam' | 'other' | ''
  religionOther?: string
  ethnicity: 'sinhalese' | 'tamil' | 'muslim' | 'burgher' | 'other' | ''
  ethnicityOther?: string
  civilStatus: 'single' | 'married' | 'divorced' | 'widow' | 'separated' | 'other' | ''
  civilStatusOther?: string
  enoughMoneyForNecessities: FrequencyNRFA | ''
  mealsPerDay: 'lessThanOne' | 'one' | 'two' | 'three' | ''
  attendsSchool: YesNo | ''
  currentGrade?: string
  attendedSchoolPast?: YesNo | ''
  yearsOfSchool?: number | null
  highestEducation?: 'upToGrade5' | 'grades6to11' | 'olPassed' | 'alPassed' | 'undergraduate' | 'postgraduate' | 'other' | ''
  highestEducationOther?: string
  currentlyWorking: YesNo | ''
  currentJob?: string
  notWorkingReason?: string
  primaryOccupation: string
  livingAlone: 'yesWithHouse' | 'yesWithoutHouse' | 'noWithHouse' | 'noWithoutHouse' | ''
  livingWith: Array<'mother' | 'father' | 'siblings' | 'children' | 'friends' | 'otherRelatives' | 'spouse' | 'others'>
  livingWithOtherRelatives?: string
  livingWithOthers?: string
  advisedBy: Array<'ownDecision' | 'communityReligious' | 'familyRelative' | 'health' | 'legal' | 'police' | 'fieldOfficer' | 'education' | 'other'>
  advisedByOther?: string
  cameAlone: YesNo | ''
  cameWith?: string
  // B. Session summary
  presentingProblem: string
  referredTo: Array<'medical' | 'psychiatric' | 'economicFinancial' | 'legal' | 'clinicalPsychology' | 'vocational' | 'childServices' | 'rehabilitationCentre' | 'counselling' | 'other'>
  referredToOther?: string
  actions: Array<'madeReferrals' | 'providedInformation' | 'psychoEducation' | 'singleSession' | 'intakeForCounselling' | 'other'>
  actionsOther?: string
  comments: string
}

/* ---------- Form B — Client Intake Form ---------- */

export type ProblemFrequency = 'notAtAll' | 'rarely' | 'sometimes' | 'often'

/** One dated administration of the Problem Rating Scale (sections E and F). */
export interface ProblemRating {
  id: ID
  kind: 'intake' | 'followUp'
  date: ISODate
  /** Section E items 1–10, keyed e1..e10. */
  emotional: Record<string, ProblemFrequency | ''>
  /** Section F items 1–6, keyed f1..f6. */
  behavioural: Record<string, ProblemFrequency | ''>
}

export interface IntakeForm {
  sessionLocation: string
  date: ISODate
  counsellorName: string
  // C. Client interview summary
  presentingProblem: string
  additionalProblems: string
  personalHistory: string
  strengthsAndResources: string
  familyStructure: string
  socialSupport: string
  barriersToCounselling: string
  clientActions: string
  // D. Physical health
  overallHealth: 'veryPoor' | 'poor' | 'fair' | 'good' | 'veryGood' | ''
  hasMedicalProblems: YesNo | ''
  medicalProblems?: string
  pastSubstanceProblem: YesNo | ''
  currentAlcoholProblem: FrequencyNRFA | ''
  currentDrugProblem: FrequencyNRFA | ''
  // E & F. Problem rating scale (intake + follow-ups)
  ratings: ProblemRating[]
}

/* ---------- Assessment Form (තක්සේරු කිරීමේ පෝරමය) ---------- */

export type SymptomFrequency = 'notAtAll' | 'rarely' | 'sometimes' | 'always'

export interface AssessmentForm {
  id: ID
  date: ISODate
  counsellorName: string
  /** Section ඈ — substance use, questions a1..a11 plus a8i..a8iii, free text. */
  substanceUse: Record<string, string>
  /** Section ඉ — symptom items s1..s10 on the 4-point frequency scale. */
  symptoms: Record<string, SymptomFrequency | ''>
  /** Section ඊ — functioning difficulties q11..q15: yes/no plus details. */
  functioning: Record<string, { answer: YesNo | ''; details: string }>
}

/* ---------- Case record ---------- */

export interface SessionNote {
  id: ID
  appointmentId?: ID
  date: ISODateTime
  mode: SessionMode
  durationMin: number
  category: SessionCategory
  /** Clinical note — visible only to roles with sessionNotes:view (FR-067). */
  note: string
  authorId: ID
}

export type ReferralDirection = 'inbound' | 'outbound'
export type ReferralSource = 'hospital' | 'prison' | 'gramaNiladhari' | 'dsFieldOfficer' | 'self' | 'other'
export type ReferralStatus = 'received' | 'underReview' | 'accepted' | 'actioned' | 'closed'

/** Referral record — fields limited to those in the pre-bid answer (FR-071, FR-073). */
export interface Referral {
  id: ID
  direction: ReferralDirection
  source?: ReferralSource
  sourceOrganisation?: string
  /** Outbound: where the client was referred (Form A Q14 categories or free text). */
  destination?: string
  referralDate: ISODate
  receivingDistrictId?: ID
  receivingDsDivisionId?: ID
  beneficiaryId?: ID
  /** Contact details as provided by the referrer, only where authorised. */
  contactName?: string
  contactPhone?: string
  reason: string
  urgency: 'routine' | 'priority' | 'urgent'
  consentStatus: 'obtained' | 'notObtained' | 'notApplicable'
  counsellorId?: ID
  status: ReferralStatus
  actions: Array<{ at: ISODateTime; byUserId: ID; text: string }>
  enteredByUserId: ID
  createdAt: ISODateTime
}

export interface FollowUp {
  id: ID
  title: string
  dueDate: ISODate
  status: 'open' | 'done'
  createdAt: ISODateTime
  closedAt?: ISODateTime
}

/** Saved self-assessment result for a registered beneficiary (FR-028/030). Never created for anonymous users. */
export interface SelfAssessmentResult {
  id: ID
  beneficiaryId: ID
  tool: SelfAssessmentType
  score: number
  bandKey: string
  completedAt: ISODateTime
}

export type SelfAssessmentType = 'stress' | 'anxiety' | 'depression' | 'wellbeing'

/** Clinical record for a beneficiary; links to PII by `beneficiaryId` only (DAT-008). */
export interface CaseRecord {
  id: ID
  beneficiaryId: ID
  counsellorId: ID
  openedAt: ISODateTime
  status: 'open' | 'closed'
  primaryCategory?: SessionCategory
  screening?: ScreeningForm
  intake?: IntakeForm
  assessments: AssessmentForm[]
  notes: SessionNote[]
  followUps: FollowUp[]
  updatedAt: ISODateTime
}
