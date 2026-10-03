export interface Prob { home: number; draw: number; away: number }
export type ProbKey = keyof Prob

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)))

/** Re-balances the other values so the three add up to 100 after `changed` was moved.
 *  Limited overs (hasDraw=false): draw stays 0 and the other side takes the remainder. */
export function normalise(p: Prob, changed: ProbKey, hasDraw: boolean): Prob {
  const value = clamp(p[changed])
  if (!hasDraw) {
    if (changed === 'draw') return { home: 50, draw: 0, away: 50 }
    return changed === 'home' ? { home: value, draw: 0, away: 100 - value } : { home: 100 - value, draw: 0, away: value }
  }
  const others = (['home', 'draw', 'away'] as const).filter((k) => k !== changed)
  const rest = 100 - value
  const sum = p[others[0]] + p[others[1]]
  const first = sum > 0 ? Math.round((rest * p[others[0]]) / sum) : Math.round(rest / 2)
  return { ...p, [changed]: value, [others[0]]: first, [others[1]]: rest - first } as Prob
}
