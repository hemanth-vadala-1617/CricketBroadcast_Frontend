import type { MatchBreak } from '../../lib/types'

export type BreakKind = 'StrategicTimeout' | 'DrinksBreak' | 'InjuryBreak' | 'RainDelay' | 'BadLight' | 'WetOutfield' | 'Lunch' | 'Tea' | 'Stumps' | 'Other'

export interface BreakOption { kind: BreakKind; label: string; /** the usual length in minutes (0 = no fixed length) */ minutes: number }

// Every kind of stoppage, with its usual length. The server knows the same lengths; these are for the buttons and hints.
const ALL: Record<BreakKind, BreakOption> = {
  StrategicTimeout: { kind: 'StrategicTimeout', label: 'Strategic timeout', minutes: 3 },
  DrinksBreak: { kind: 'DrinksBreak', label: 'Drinks break', minutes: 5 },
  InjuryBreak: { kind: 'InjuryBreak', label: 'Injury break', minutes: 0 },
  RainDelay: { kind: 'RainDelay', label: 'Rain delay', minutes: 0 },
  BadLight: { kind: 'BadLight', label: 'Bad light', minutes: 0 },
  WetOutfield: { kind: 'WetOutfield', label: 'Wet outfield', minutes: 0 },
  Lunch: { kind: 'Lunch', label: 'Lunch', minutes: 40 },
  Tea: { kind: 'Tea', label: 'Tea', minutes: 20 },
  Stumps: { kind: 'Stumps', label: 'Stumps', minutes: 0 },
  Other: { kind: 'Other', label: 'Other pause', minutes: 0 },
}

/** The breaks to offer: the shorter formats get the strategic timeout, a Test gets lunch, tea and stumps. */
export function breakOptions(isTest: boolean): BreakOption[] {
  const kinds: BreakKind[] = isTest
    ? ['DrinksBreak', 'Lunch', 'Tea', 'Stumps', 'RainDelay', 'BadLight', 'WetOutfield', 'InjuryBreak', 'Other']
    : ['StrategicTimeout', 'DrinksBreak', 'InjuryBreak', 'RainDelay', 'BadLight', 'WetOutfield', 'Other']
  return kinds.map((k) => ALL[k])
}

/** "3:05", or "1:12:00" from an hour up. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`
}

/** What the clock shows: time left when the break has a planned length, otherwise how long it has lasted. */
export function clockFor(brk: Pick<MatchBreak, 'plannedSeconds'>, elapsedSeconds: number): { text: string; label: string; overrun: boolean } {
  if (brk.plannedSeconds > 0) {
    const left = brk.plannedSeconds - elapsedSeconds
    return left >= 0 ? { text: formatClock(left), label: 'REMAINING', overrun: false } : { text: `+${formatClock(-left)}`, label: 'OVER TIME', overrun: true }
  }
  return { text: formatClock(elapsedSeconds), label: 'ELAPSED', overrun: false }
}

export interface BreakLook { title: string; subtitle: string; accent: string; dark: string }

export function breakLook(kind: string, label: string): BreakLook {
  switch (kind as BreakKind) {
    case 'StrategicTimeout': return { title: label, subtitle: 'Teams in the huddle', accent: '#38bdf8', dark: '#082f49' }
    case 'DrinksBreak': return { title: label, subtitle: 'Players take on fluids', accent: '#34d399', dark: '#052e16' }
    case 'InjuryBreak': return { title: label, subtitle: 'Medical attention on the field', accent: '#f87171', dark: '#450a0a' }
    case 'RainDelay': return { title: label, subtitle: 'Play will resume when conditions allow', accent: '#93c5fd', dark: '#172554' }
    case 'BadLight': return { title: label, subtitle: 'Umpires have stopped play', accent: '#fbbf24', dark: '#422006' }
    case 'WetOutfield': return { title: label, subtitle: 'Umpires are inspecting the ground', accent: '#5eead4', dark: '#042f2e' }
    case 'Lunch': return { title: label, subtitle: 'Back after the interval', accent: '#fb923c', dark: '#431407' }
    case 'Tea': return { title: label, subtitle: 'Back after the interval', accent: '#fcd34d', dark: '#422006' }
    case 'Stumps': return { title: label, subtitle: 'Close of play for the day', accent: '#c4b5fd', dark: '#2e1065' }
    default: return { title: label || 'Play paused', subtitle: 'Play is paused', accent: '#fbbf24', dark: '#1c1917' }
  }
}
