import { create } from 'zustand'

export interface ToastItem { id: number; tone: 'success' | 'error' | 'info'; message: string }
let next = 1

interface ToastState {
  items: ToastItem[]
  push: (tone: ToastItem['tone'], message: string) => void
  dismiss: (id: number) => void
}

export const useToast = create<ToastState>((set, get) => ({
  items: [],
  push: (tone, message) => {
    const id = next++
    set({ items: [...get().items.slice(-3), { id, tone, message }] })
    setTimeout(() => get().dismiss(id), tone === 'error' ? 7000 : 3500)
  },
  dismiss: (id) => set({ items: get().items.filter((t) => t.id !== id) }),
}))

export const toast = {
  success: (m: string) => useToast.getState().push('success', m),
  error: (m: string) => useToast.getState().push('error', m),
  info: (m: string) => useToast.getState().push('info', m),
}
