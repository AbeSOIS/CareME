import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { LanguageCode, Localized } from '../types'
import en from './en.json'
import si from './si.json'
import ta from './ta.json'

export const LANGUAGES: LanguageCode[] = ['si', 'ta', 'en']

/** BCP-47 tags used for <html lang> and Intl formatting. */
export const LOCALE_TAG: Record<LanguageCode, string> = { si: 'si-LK', ta: 'ta-LK', en: 'en-LK' }

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, si: { translation: si }, ta: { translation: ta } },
  lng: 'si',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

/** Pick the current language from a Localized value, falling back to English. */
export function pick(value: Partial<Localized> | undefined, lang: LanguageCode): string {
  if (!value) return ''
  return value[lang] ?? value.en ?? ''
}

export default i18n
