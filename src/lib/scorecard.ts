import type { BatterLine, InningsScorecard, MatchState } from './types'
import { ordinal } from './utils'

// The red line above the scorecard: the chase, the lead, the result, or the toss before play.
export function statusLine(state: MatchState): string {
  if (state.resultText) return state.resultText
  const inn = state.innings
  if (inn?.status === 'InProgress' && inn.leadText) return inn.leadText
  switch (state.status) {
    case 'InningsBreak': return 'Innings break'
    case 'RainDelay': return 'Play suspended: rain delay'
    case 'Paused': return 'Play paused'
    default: return state.tossText ?? ''
  }
}

// "WI (2nd Inn)": the button that switches between innings.
export function inningsLabel(card: Pick<InningsScorecard, 'battingTeam' | 'inningsNumber'>): string {
  return `${card.battingTeam.shortName} (${ordinal(card.inningsNumber)} Inn)`
}

// "Shai Hope (c & wk)"
export function batterName(b: Pick<BatterLine, 'name' | 'isCaptain' | 'isWicketKeeper'>): string {
  const role = b.isCaptain && b.isWicketKeeper ? 'c & wk' : b.isCaptain ? 'c' : b.isWicketKeeper ? 'wk' : ''
  return role ? `${b.name} (${role})` : b.name
}

// What is written beside the batter: how he got out, or batting / not out.
export function howOut(b: Pick<BatterLine, 'status' | 'dismissalText'>): string {
  return b.status === 'out' ? b.dismissalText : b.status
}

// A rate to two decimals, or a dash when the server did not send one (an older API build).
export function rate(n: number | null | undefined): string {
  return typeof n === 'number' && Number.isFinite(n) ? n.toFixed(2) : '-'
}

export type Tone = 'good' | 'ok' | 'poor'

// Strike rate colour: 150+ is quick scoring, under 100 is slow (T20-style thresholds, a hint only).
export function strikeRateTone(sr: number | null | undefined): Tone {
  if (typeof sr !== 'number' || !Number.isFinite(sr)) return 'ok'
  return sr >= 150 ? 'good' : sr >= 100 ? 'ok' : 'poor'
}

// Economy colour: a tight bowler is green, an expensive one red.
export function economyTone(eco: number | null | undefined): Tone {
  if (typeof eco !== 'number' || !Number.isFinite(eco)) return 'ok'
  return eco <= 6 ? 'good' : eco <= 9 ? 'ok' : 'poor'
}

// A batter's share of the best score in the innings, 0..100, for the little bar under his name.
export function runShare(runs: number, topScore: number): number {
  if (topScore <= 0 || runs <= 0) return 0
  return Math.min(100, Math.round((runs / topScore) * 100))
}

// Where a wicket sits on the fall-of-wickets track: its score as a share of the innings total, 0..100.
export function fowPosition(score: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((score / total) * 100)))
}

export function totalLine(card: Pick<InningsScorecard, 'runs' | 'wickets' | 'overs' | 'runRate'>): string {
  return `${card.runs}-${card.wickets} (${card.overs} Overs, RR: ${rate(card.runRate)})`
}

// Innings in the order shown: newest first, as on a live scorecard.
export function inningsNewestFirst(cards: InningsScorecard[]): InningsScorecard[] {
  return [...cards].sort((a, b) => b.inningsNumber - a.inningsNumber)
}
