import type { MatchSummary } from '../../lib/types'

export type NextStepKind = 'setup' | 'start' | 'score' | 'none'

export interface NextStep {
  kind: NextStepKind
  label: string
  /** One line telling the user why the match is not live yet (or what is happening). */
  hint: string
  /** The planned start time has passed but the match has not been started. */
  overdue: boolean
}

const PLAYING = new Set(['Live', 'InningsBreak', 'RainDelay', 'Paused'])

/**
 * A match goes Live only when someone starts it (squads, toss, Start). The scheduled time is a plan, not a trigger,
 * so the list tells the user the next real step instead of leaving a match "Scheduled" with no explanation.
 */
export function nextStep(m: Pick<MatchSummary, 'status' | 'squadSize' | 'scheduledStart'>, now: Date = new Date()): NextStep {
  const overdue = !!m.scheduledStart && new Date(m.scheduledStart).getTime() <= now.getTime()
  switch (m.status) {
    case 'Scheduled': {
      const haveSquads = m.squadSize >= 4          // both teams need at least 2 players in the XI
      return {
        kind: 'setup', overdue,
        label: haveSquads ? 'Record toss' : 'Set up squads',
        hint: `${overdue ? 'Start time has passed, but the match is not live. ' : ''}${haveSquads ? 'Record the toss, then start the match.' : 'Pick the playing XI and record the toss, then start the match.'}`,
      }
    }
    case 'TossCompleted':
      return { kind: 'start', overdue, label: 'Start match', hint: `${overdue ? 'Start time has passed. ' : ''}Toss done. Press Start to go live.` }
    default:
      return PLAYING.has(m.status)
        ? { kind: 'score', overdue: false, label: 'Score', hint: '' }
        : { kind: 'none', overdue: false, label: '', hint: '' }
  }
}