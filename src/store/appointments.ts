import { create } from 'zustand'
import { bookingApi, counsellorApi } from '../services/api'
import type { AppointmentView, ID } from '../types'

interface AppointmentsState {
  mine: AppointmentView[]
  counsellor: AppointmentView[]
  loading: boolean
  loadMine: () => Promise<void>
  loadCounsellor: () => Promise<void>
  /** Replace one appointment in whichever list holds it. */
  upsert: (apt: AppointmentView) => void
  cancel: (id: ID, confirmLate?: boolean) => Promise<AppointmentView>
}

const replace = (list: AppointmentView[], apt: AppointmentView) =>
  list.some((a) => a.id === apt.id) ? list.map((a) => (a.id === apt.id ? { ...a, ...apt } : a)) : [apt, ...list]

export const useAppointments = create<AppointmentsState>((set, get) => ({
  mine: [],
  counsellor: [],
  loading: false,
  loadMine: async () => {
    set({ loading: true })
    try {
      set({ mine: await bookingApi.mine() })
    } finally {
      set({ loading: false })
    }
  },
  loadCounsellor: async () => {
    set({ loading: true })
    try {
      set({ counsellor: await counsellorApi.appointments() })
    } finally {
      set({ loading: false })
    }
  },
  upsert: (apt) =>
    set((s) => ({
      mine: s.mine.some((a) => a.id === apt.id) ? replace(s.mine, apt) : s.mine,
      counsellor: s.counsellor.some((a) => a.id === apt.id) ? replace(s.counsellor, apt) : s.counsellor,
    })),
  cancel: async (id, confirmLate) => {
    const apt = await bookingApi.cancel(id, confirmLate)
    get().upsert(apt)
    return apt
  },
}))
