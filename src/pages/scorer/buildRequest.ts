import type { DismissalType, ExtrasType, ScoreBallInput } from '../../lib/types'

/** What the scorer pressed. The server decides what is legal; these builders only shape the request. */
export type PadAction =
  | { kind: 'runs'; runs: number; boundary?: boolean }
  | { kind: 'wide'; extraRuns: number; boundary?: boolean }
  | { kind: 'noball'; bat: number; boundary?: boolean; secondary?: 'Bye' | 'LegBye'; extraRuns?: number }
  | { kind: 'bye' | 'legbye'; runs: number; boundary?: boolean }
  | {
      kind: 'wicket'; dismissal: DismissalType; dismissedPlayerId?: string | null; fielderId?: string | null
      newBatterId?: string | null; runs?: number; ballType?: 'None' | 'Wide' | 'NoBall'
    }

export function buildBall(action: PadAction, clientRequestId: string): ScoreBallInput {
  const base: ScoreBallInput = {
    clientRequestId, runsBat: 0, extraRuns: 0, extrasType: 'None', secondaryExtrasType: 'None', isBoundary: false, wicket: null,
  }
  switch (action.kind) {
    case 'runs':
      return { ...base, runsBat: action.runs, isBoundary: !!action.boundary || action.runs === 6 }
    case 'wide':
      return { ...base, extrasType: 'Wide', extraRuns: action.extraRuns, isBoundary: !!action.boundary }
    case 'noball': {
      const byes = action.secondary ? (action.extraRuns ?? 0) : 0
      return {
        ...base, extrasType: 'NoBall', runsBat: action.bat, extraRuns: byes,
        secondaryExtrasType: action.secondary && byes > 0 ? action.secondary : 'None',
        isBoundary: !!action.boundary || action.bat === 6,
      }
    }
    case 'bye':
    case 'legbye':
      return { ...base, extrasType: action.kind === 'bye' ? 'Bye' : 'LegBye', extraRuns: action.runs, isBoundary: !!action.boundary }
    case 'wicket':
      return {
        ...base, runsBat: action.runs ?? 0, extrasType: action.ballType ?? 'None',
        wicket: {
          dismissalType: action.dismissal, dismissedPlayerId: action.dismissedPlayerId ?? null,
          fielderId: action.fielderId ?? null, newBatterId: action.newBatterId ?? null,
        },
      }
  }
}

export const DISMISSALS: { type: DismissalType; label: string }[] = [
  { type: 'Bowled', label: 'Bowled' }, { type: 'Caught', label: 'Caught' }, { type: 'LBW', label: 'LBW' },
  { type: 'RunOut', label: 'Run out' }, { type: 'Stumped', label: 'Stumped' }, { type: 'HitWicket', label: 'Hit wicket' },
  { type: 'HandledBall', label: 'Handled ball' }, { type: 'ObstructingField', label: 'Obstructing' },
]

const FREE_HIT_OK: DismissalType[] = ['RunOut', 'HandledBall', 'ObstructingField']
const WIDE_OK: DismissalType[] = ['Stumped', 'RunOut', 'HitWicket', 'HandledBall', 'ObstructingField']
const NOBALL_OK: DismissalType[] = ['RunOut', 'HandledBall', 'ObstructingField']

/** Mirrors the server rules so the wrong buttons are greyed out; the server stays the authority. */
export function isDismissalAllowed(type: DismissalType, freeHit: boolean, ballType: ExtrasType = 'None'): boolean {
  if (freeHit && !FREE_HIT_OK.includes(type)) return false
  if (ballType === 'Wide' && !WIDE_OK.includes(type)) return false
  if (ballType === 'NoBall' && !NOBALL_OK.includes(type)) return false
  return true
}

export const canNonStrikerBeOut = (type: DismissalType) => type === 'RunOut' || type === 'ObstructingField'

export type FielderNeed = 'required' | 'optional' | 'none'
export function fielderNeed(type: DismissalType): FielderNeed {
  if (type === 'Caught' || type === 'Stumped') return 'required'
  return type === 'RunOut' ? 'optional' : 'none'
}

/** Returns an error message when the wicket form is incomplete, otherwise null. */
export function validateWicket(a: Extract<PadAction, { kind: 'wicket' }>, strikerId: string | null, nonStrikerId: string | null): string | null {
  const out = a.dismissedPlayerId ?? strikerId
  if (out && out === nonStrikerId && !canNonStrikerBeOut(a.dismissal)) return 'Only a run out or obstructing the field can dismiss the non-striker.'
  if (fielderNeed(a.dismissal) === 'required' && !a.fielderId) return a.dismissal === 'Stumped' ? 'Pick the wicket-keeper.' : 'Pick the fielder who took the catch.'
  return null
}

export function actionLabel(a: PadAction): string {
  switch (a.kind) {
    case 'runs': return String(a.runs)
    case 'wide': return a.extraRuns ? `WD+${a.extraRuns}` : 'WD'
    case 'noball': return a.bat || a.extraRuns ? `NB+${a.bat + (a.extraRuns ?? 0)}` : 'NB'
    case 'bye': return `B${a.runs}`
    case 'legbye': return `LB${a.runs}`
    case 'wicket': return 'W'
  }
}

export type Outcome = 'ok' | 'network' | 'rejected'

/**
 * One clientRequestId per user action. If the request dies on the network we do not know whether the server
 * saved it, so an IDENTICAL retry reuses the same id (the server then de-duplicates). Any other outcome clears it.
 */
export function createIdempotency(makeId: () => string) {
  let pending: { signature: string; id: string } | null = null
  return {
    idFor(signature: string): string {
      if (pending && pending.signature === signature) return pending.id
      pending = { signature, id: makeId() }
      return pending.id
    },
    settle(signature: string, outcome: Outcome) {
      if (outcome !== 'network' && pending?.signature === signature) pending = null
    },
  }
}
