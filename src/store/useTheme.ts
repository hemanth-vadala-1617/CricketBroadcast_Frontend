import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
export const THEME_KEY = 'cs-theme'
const MODES: readonly ThemeMode[] = ['light', 'dark', 'system']

function read(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return MODES.includes(v as ThemeMode) ? (v as ThemeMode) : 'system'
  } catch { return 'system' }
}

/** Whether the page should be dark right now: the chosen mode, or the device's setting for "system". Never dark on the OBS overlay. */
export function resolveDark(mode: ThemeMode, prefersDark: boolean, pathname: string): boolean {
  if (pathname.startsWith('/overlay')) return false
  return mode === 'dark' || (mode === 'system' && prefersDark)
}

export const systemPrefersDark = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches

interface ThemeState {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  /** light -> dark -> system -> light, for the one-button version. */
  cycle: () => void
}

export const useTheme = create<ThemeState>((set, get) => ({
  mode: read(),
  setMode: (mode) => {
    try { localStorage.setItem(THEME_KEY, mode) } catch { /* private window: the choice just lasts this visit */ }
    set({ mode })
  },
  cycle: () => get().setMode(MODES[(MODES.indexOf(get().mode) + 1) % MODES.length]!),
}))

/** Puts or removes the `dark` class on <html>. Called by the app root and again whenever the page, the choice or the device setting changes. */
export function applyTheme(mode: ThemeMode, pathname: string = location.pathname): void {
  document.documentElement.classList.toggle('dark', resolveDark(mode, systemPrefersDark(), pathname))
}
