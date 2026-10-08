import { create } from 'zustand'
import { casesApi, counsellorApi } from '../services/api'
import type { CaseDetail, CaseRecord, ClientSummary, ID } from '../types'

interface CasesState {
  list: ClientSummary[]
  current: CaseDetail | null
  loading: boolean
  loadList: () => Promise<void>
  open: (id: ID) => Promise<void>
  /** Merge an updated record returned by a save call into the open case. */
  applyRecord: (record: CaseRecord) => void
  close: () => void
}

export const useCases = create<CasesState>((set, get) => ({
  list: [],
  current: null,
  loading: false,
  loadList: async () => {
    set({ loading: true })
    try {
      set({ list: await counsellorApi.cases() })
    } finally {
      set({ loading: false })
    }
  },
  open: async (id) => {
    set({ loading: true, current: get().current?.record.id === id ? get().current : null })
    try {
      set({ current: await casesApi.get(id) })
    } finally {
      set({ loading: false })
    }
  },
  applyRecord: (record) => {
    const current = get().current
    if (current && current.record.id === record.id) set({ current: { ...current, record } })
  },
  close: () => set({ current: null }),
}))
