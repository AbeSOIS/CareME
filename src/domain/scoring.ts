import type { AssessmentTool, ScoreBand } from '../config/assessments'

export interface ScoreResult {
  score: number
  band: ScoreBand
  /** A risk item (PHQ-9 item 9) was answered above zero. */
  riskFlag: boolean
}

/** Score a completed self-assessment. `answers` maps item id → option value. */
export function scoreAssessment(tool: AssessmentTool, answers: Readonly<Record<string, number>>): ScoreResult {
  const maxOption = Math.max(...tool.options.map((o) => o.value))
  let raw = 0
  let riskFlag = false
  for (const item of tool.items) {
    const value = answers[item.id]
    if (value === undefined) throw new Error(`Unanswered item ${item.id}`)
    raw += item.reverse ? maxOption - value : value
    if (item.riskItem && value > 0) riskFlag = true
  }
  const score = tool.transform ? tool.transform(raw) : raw
  const band = tool.bands.find((b) => score <= b.max) ?? tool.bands[tool.bands.length - 1]
  return { score, band, riskFlag }
}
