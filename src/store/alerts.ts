import { create } from 'zustand'
import { alertsApi } from '../services/api'
import type { AlertView, Handover, ID, PublicAlertStatus } from '../types'

/** Id of the alert this browser tab raised, so the person can follow its status. Only the id is kept. */
const RAISED_KEY = 'careme:raisedAlert'

function readRaised(): ID | null {
  try {
    return sessionStorage.getItem(RAISED_KEY)
  } catch {
    return null
  }
}

interface AlertsState {
  queue: AlertView[]
  handover: Handover | null
  raisedId: ID | null
  raisedStatus: PublicAlertStatus | null
  loadQueue: () => Promise<void>
  upsert: (alert: AlertView) => void
  loadHandover: () => Promise<void>
  raise: (body: { message?: string; contactPhone?: string; beneficiaryId?: ID }) => Promise<PublicAlertStatus>
  pollRaised: () => Promise<void>
  clearRaised: () => void
}

export const useAlerts = create<AlertsState>((set, get) => ({
  queue: [],
  handover: null,
  raisedId: readRaised(),
  raisedStatus: null,
  loadQueue: async () => set({ queue: await alertsApi.list() }),
  upsert: (alert) => set((s) => ({ queue: s.queue.map((a) => (a.id === alert.id ? alert : a)) })),
  loadHandover: async () => set({ handover: await alertsApi.handover() }),
  raise: async (body) => {
    const status = await alertsApi.raise(body)
    if (!body.beneficiaryId) {
      try {
        sessionStorage.setItem(RAISED_KEY, status.id)
      } catch {
        // ignore
      }
      set({ raisedId: status.id, raisedStatus: status })
    }
    return status
  },
  pollRaised: async () => {
    const id = get().raisedId
    if (!id) return
    try {
      set({ raisedStatus: await alertsApi.status(id) })
    } catch {
      get().clearRaised()
    }
  },
  clearRaised: () => {
    try {
      sessionStorage.removeItem(RAISED_KEY)
    } catch {
      // ignore
    }
    set({ raisedId: null, raisedStatus: null })
  },
}))
