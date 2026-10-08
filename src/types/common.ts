/** ISO-8601 timestamp string, e.g. "2026-10-08T09:30:00.000Z". */
export type ISODateTime = string

/** Calendar date string "YYYY-MM-DD". */
export type ISODate = string

export type ID = string

export type LanguageCode = 'si' | 'ta' | 'en'

/** Languages a counselling session can be delivered in (FR-016, NFR-013). */
export type CounsellingLanguage = 'si' | 'ta' | 'en' | 'sign'

export type Gender = 'female' | 'male' | 'other' | 'undisclosed'

/** Age bands used by dashboards and management reports (REP-003). */
export type AgeGroup = 'under18' | '18-25' | '26-35' | '36-50' | '51-65' | 'over65'

/** A value captured in all three interface languages (FR-049, NFR-012). */
export type Localized<T = string> = Record<LanguageCode, T>

export interface District {
  id: ID
  name: Localized
  province: string
}

export interface DivisionalSecretariat {
  id: ID
  districtId: ID
  name: Localized
}
