import { create } from 'zustand'
import type { LanguageCode } from '../types'

export type Theme = 'light' | 'dark'

export interface Toast {
  id: number
  tone: 'success' | 'error' | 'info'
  message: string
}

const LANG_KEY = 'careme:ui:language'
const THEME_KEY = 'careme:ui:theme'

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null
    return v && allowed.includes(v) ? v : fallback
  } catch {
    return fallback
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore — preference simply won't persist
  }
}

function initialTheme(): Theme {
  // Light is the default; only an explicit user choice switches to dark.
  return readPref<Theme>(THEME_KEY, ['light', 'dark'], 'light')
}

interface UiState {
  language: LanguageCode
  theme: Theme
  toasts: Toast[]
  mobileNavOpen: boolean
  setLanguage: (lang: LanguageCode) => void
  toggleTheme: () => void
  toast: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
  setMobileNav: (open: boolean) => void
}

let toastSeq = 0

export const useUi = create<UiState>((set, get) => ({
  language: readPref<LanguageCode>(LANG_KEY, ['si', 'ta', 'en'], 'si'),
  theme: initialTheme(),
  toasts: [],
  mobileNavOpen: false,
  setLanguage: (language) => {
    writePref(LANG_KEY, language)
    set({ language })
  },
  toggleTheme: () => {
    const theme = get().theme === 'dark' ? 'light' : 'dark'
    writePref(THEME_KEY, theme)
    set({ theme })
  },
  toast: (message, tone = 'info') => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }] }))
    setTimeout(() => get().dismissToast(id), tone === 'error' ? 8000 : 5000)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setMobileNav: (mobileNavOpen) => set({ mobileNavOpen }),
}))
