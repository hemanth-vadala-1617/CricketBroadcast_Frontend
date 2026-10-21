import type { MatchState } from '../../lib/types'

/** How long the six-meter graphic stays on air. */
export const SIX_METER_MS = 5200

export type SixTier = 'standard' | 'eighty' | 'ninety' | 'hundred' | 'hundredPlus'

export interface SixMeter {
  id: string
  meters: number
  tier: SixTier
  /** Short badge text in the tier plate ("80+", "90+", "100", "100+"; empty for a normal six). */
  badge: string
  label: string
  name: string
}

/** Ranges of the IPL-style six meter: 80+, 90+, exactly 100, and beyond 100. Anything shorter is a plain distance card. */
export function tierFor(meters: number): { tier: SixTier; badge: string; label: string } {
  if (meters > 100) return { tier: 'hundredPlus', badge: '100+', label: 'MONSTER HIT' }
  if (meters === 100) return { tier: 'hundred', badge: '100', label: '100 METRE SIX' }
  if (meters >= 90) return { tier: 'ninety', badge: '90+', label: 'HUGE SIX' }
  if (meters >= 80) return { tier: 'eighty', badge: '80+', label: 'BIG HIT' }
  return { tier: 'standard', badge: '', label: 'SIX METER' }
}

/** The six meter for the last ball, once the scorer has entered a distance (null otherwise). */
export function describeSixMeter(state: MatchState): SixMeter | null {
  const ball = state.lastBall
  const meters = ball?.sixDistance
  if (!ball || ball.kind !== 'Six' || !meters || meters <= 0) return null
  return { id: `${ball.ballId}:${meters}`, meters, ...tierFor(meters), name: state.innings?.striker?.name ?? '' }
}
