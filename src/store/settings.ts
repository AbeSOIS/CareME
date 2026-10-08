import { create } from 'zustand'
import { DEFAULT_SETTINGS } from '../config/defaults'
import { settingsApi } from '../services/api'
import type { Settings } from '../types'

interface SettingsState {
  settings: Settings
  loaded: boolean
  load: () => Promise<void>
  save: (patch: Partial<Settings>) => Promise<Settings>
}

export const useSettings = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    const settings = await settingsApi.get()
    set({ settings, loaded: true })
  },
  save: async (patch) => {
    const settings = await settingsApi.save(patch)
    set({ settings })
    return settings
  },
}))
