import type { SelfAssessmentType } from '../types'

/**
 * Self-assessment content — SAMPLE ONLY, pending the Ministry's Annex 3 (Client Tools
 * Specification). Uses well-known public-domain / free-to-use instruments:
 * PSS-10 (Cohen), GAD-7 and PHQ-9 (Pfizer, no permission required), WHO-5 (WHO).
 * Item text is English only; validated Sinhala and Tamil versions are required before use.
 */

export interface AssessmentOption {
  /** i18n key under assess.options. */
  labelKey: string
  value: number
}

export interface AssessmentItem {
  id: string
  text: string
  /** PSS-10 positively worded items are reverse scored. */
  reverse?: boolean
  /** Any answer above 0 triggers the emergency call-to-action (PHQ-9 item 9). */
  riskItem?: boolean
}

export interface ScoreBand {
  /** Inclusive upper bound of the (transformed) score. */
  max: number
  /** i18n key under assess.bands. */
  key: string
  tone: 'good' | 'mild' | 'moderate' | 'severe'
}

export interface AssessmentTool {
  type: SelfAssessmentType
  instrument: string
  /** i18n key under assess.prompts. */
  promptKey: string
  options: AssessmentOption[]
  items: AssessmentItem[]
  /** Optional transform of the raw sum (WHO-5 → percentage). */
  transform?: (raw: number) => number
  maxScore: number
  bands: ScoreBand[]
  /** Higher score = better (WHO-5). */
  higherIsBetter?: boolean
}

const FREQ_0_3: AssessmentOption[] = [
  { labelKey: 'notAtAll', value: 0 },
  { labelKey: 'severalDays', value: 1 },
  { labelKey: 'moreThanHalf', value: 2 },
  { labelKey: 'nearlyEveryDay', value: 3 },
]

const PSS_0_4: AssessmentOption[] = [
  { labelKey: 'never', value: 0 },
  { labelKey: 'almostNever', value: 1 },
  { labelKey: 'sometimes', value: 2 },
  { labelKey: 'fairlyOften', value: 3 },
  { labelKey: 'veryOften', value: 4 },
]

const WHO5_0_5: AssessmentOption[] = [
  { labelKey: 'allOfTheTime', value: 5 },
  { labelKey: 'mostOfTheTime', value: 4 },
  { labelKey: 'moreThanHalfTime', value: 3 },
  { labelKey: 'lessThanHalfTime', value: 2 },
  { labelKey: 'someOfTheTime', value: 1 },
  { labelKey: 'atNoTime', value: 0 },
]

export const ASSESSMENTS: Record<SelfAssessmentType, AssessmentTool> = {
  stress: {
    type: 'stress',
    instrument: 'PSS-10',
    promptKey: 'lastMonth',
    options: PSS_0_4,
    maxScore: 40,
    items: [
      { id: 'pss1', text: 'How often have you been upset because of something that happened unexpectedly?' },
      { id: 'pss2', text: 'How often have you felt that you were unable to control the important things in your life?' },
      { id: 'pss3', text: 'How often have you felt nervous and "stressed"?' },
      { id: 'pss4', text: 'How often have you felt confident about your ability to handle your personal problems?', reverse: true },
      { id: 'pss5', text: 'How often have you felt that things were going your way?', reverse: true },
      { id: 'pss6', text: 'How often have you found that you could not cope with all the things that you had to do?' },
      { id: 'pss7', text: 'How often have you been able to control irritations in your life?', reverse: true },
      { id: 'pss8', text: 'How often have you felt that you were on top of things?', reverse: true },
      { id: 'pss9', text: 'How often have you been angered because of things that were outside of your control?' },
      { id: 'pss10', text: 'How often have you felt difficulties were piling up so high that you could not overcome them?' },
    ],
    bands: [
      { max: 13, key: 'lowStress', tone: 'good' },
      { max: 26, key: 'moderateStress', tone: 'moderate' },
      { max: 40, key: 'highStress', tone: 'severe' },
    ],
  },
  anxiety: {
    type: 'anxiety',
    instrument: 'GAD-7',
    promptKey: 'lastTwoWeeks',
    options: FREQ_0_3,
    maxScore: 21,
    items: [
      { id: 'gad1', text: 'Feeling nervous, anxious, or on edge' },
      { id: 'gad2', text: 'Not being able to stop or control worrying' },
      { id: 'gad3', text: 'Worrying too much about different things' },
      { id: 'gad4', text: 'Trouble relaxing' },
      { id: 'gad5', text: 'Being so restless that it is hard to sit still' },
      { id: 'gad6', text: 'Becoming easily annoyed or irritable' },
      { id: 'gad7', text: 'Feeling afraid, as if something awful might happen' },
    ],
    bands: [
      { max: 4, key: 'minimal', tone: 'good' },
      { max: 9, key: 'mild', tone: 'mild' },
      { max: 14, key: 'moderate', tone: 'moderate' },
      { max: 21, key: 'severe', tone: 'severe' },
    ],
  },
  depression: {
    type: 'depression',
    instrument: 'PHQ-9',
    promptKey: 'lastTwoWeeks',
    options: FREQ_0_3,
    maxScore: 27,
    items: [
      { id: 'phq1', text: 'Little interest or pleasure in doing things' },
      { id: 'phq2', text: 'Feeling down, depressed, or hopeless' },
      { id: 'phq3', text: 'Trouble falling or staying asleep, or sleeping too much' },
      { id: 'phq4', text: 'Feeling tired or having little energy' },
      { id: 'phq5', text: 'Poor appetite or overeating' },
      {
        id: 'phq6',
        text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
      },
      {
        id: 'phq7',
        text: 'Trouble concentrating on things, such as reading the newspaper or watching television',
      },
      {
        id: 'phq8',
        text: 'Moving or speaking so slowly that other people could have noticed, or being so fidgety or restless that you have been moving around a lot more than usual',
      },
      { id: 'phq9', text: 'Thoughts that you would be better off dead, or of hurting yourself', riskItem: true },
    ],
    bands: [
      { max: 4, key: 'minimal', tone: 'good' },
      { max: 9, key: 'mild', tone: 'mild' },
      { max: 14, key: 'moderate', tone: 'moderate' },
      { max: 19, key: 'moderatelySevere', tone: 'severe' },
      { max: 27, key: 'severe', tone: 'severe' },
    ],
  },
  wellbeing: {
    type: 'wellbeing',
    instrument: 'WHO-5',
    promptKey: 'lastTwoWeeksWellbeing',
    options: WHO5_0_5,
    maxScore: 100,
    higherIsBetter: true,
    transform: (raw) => raw * 4,
    items: [
      { id: 'who1', text: 'I have felt cheerful and in good spirits' },
      { id: 'who2', text: 'I have felt calm and relaxed' },
      { id: 'who3', text: 'I have felt active and vigorous' },
      { id: 'who4', text: 'I woke up feeling fresh and rested' },
      { id: 'who5', text: 'My daily life has been filled with things that interest me' },
    ],
    bands: [
      { max: 28, key: 'veryLowWellbeing', tone: 'severe' },
      { max: 50, key: 'lowWellbeing', tone: 'moderate' },
      { max: 100, key: 'goodWellbeing', tone: 'good' },
    ],
  },
}

export const ASSESSMENT_TYPES: SelfAssessmentType[] = ['stress', 'anxiety', 'depression', 'wellbeing']
