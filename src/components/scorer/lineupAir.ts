import type { MatchState } from '../../lib/types'

// The team whose playing XI is on air right now (graphics.TeamLineup.payload.teamId), or null.
export function lineupOnAir(state: MatchState): string | null {
  const g = state.graphics.TeamLineup
  const id = g?.isVisible ? g.payload?.teamId : undefined
  return typeof id === 'string' ? id : null
}

export interface LineupCall { isVisible: boolean; payload?: { teamId: string } }

// What one tap on a team's toggle sends: on air already -> hide it; otherwise show it (switching teams if the other one was on).
export function lineupCall(state: MatchState, teamId: string): LineupCall {
  return lineupOnAir(state) === teamId ? { isVisible: false } : { isVisible: true, payload: { teamId } }
}
