import type { MatchState, Milestone } from '../../lib/types'

/** How long each milestone card stays on air. */
export const MILESTONE_MS = 5500

export interface MilestoneView { title: string; sub: string; tier: 'silver' | 'gold' | 'purple' | 'green' | 'red' | 'orange' }

/** What the card says for a milestone. */
export function describeMilestone(m: Milestone): MilestoneView {
  if (m.kind === 'Runs') {
    const v = m.value
    if (v >= 200) return { title: v === 200 ? 'DOUBLE CENTURY' : `${v} RUNS`, sub: 'WHAT AN INNINGS', tier: 'purple' }
    if (v >= 150) return { title: `${v} RUNS`, sub: 'A MASTERCLASS', tier: 'purple' }
    if (v >= 100) return { title: 'CENTURY', sub: `${v} RUNS`, tier: 'gold' }
    return { title: 'FIFTY', sub: `${v} RUNS`, tier: 'silver' }
  }
  if (m.kind === 'FiveWickets') return { title: 'FIVE-WICKET HAUL', sub: '5 WICKETS', tier: 'red' }
  if (m.kind === 'FourWickets') return { title: 'FOUR-WICKET HAUL', sub: '4 WICKETS', tier: 'orange' }
  return { title: 'MAIDEN OVER', sub: m.value > 1 ? `${m.value} MAIDENS` : 'NO RUNS FROM THE OVER', tier: 'green' }
}

/** Milestones in the state that have not been shown yet (ids are unique per occurrence). */
export function freshMilestones(state: MatchState, seen: ReadonlySet<string>): Milestone[] {
  return (state.milestones ?? []).filter((m) => !seen.has(m.id))
}
