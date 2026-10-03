import type { BallKind } from '../../lib/types'

export const chipColors: Record<BallKind, { bg: string; fg: string; border: string }> = {
  Dot: { bg: 'transparent', fg: '#fff', border: '#ffffffcc' },
  Runs: { bg: '#ffffff', fg: '#0f172a', border: '#ffffff' },
  Four: { bg: '#16a34a', fg: '#fff', border: '#bbf7d0' },
  Six: { bg: '#7e22ce', fg: '#fff', border: '#e9d5ff' },
  Wicket: { bg: '#dc2626', fg: '#fff', border: '#fecaca' },
  Wide: { bg: '#f59e0b', fg: '#1c1917', border: '#fde68a' },
  NoBall: { bg: '#f59e0b', fg: '#1c1917', border: '#fde68a' },
  Bye: { bg: '#0d9488', fg: '#fff', border: '#99f6e4' },
  LegBye: { bg: '#0d9488', fg: '#fff', border: '#99f6e4' },
}

