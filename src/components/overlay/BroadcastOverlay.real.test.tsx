import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BroadcastOverlay } from './BroadcastOverlay'
import real from './fixtures/realState.json'
import type { MatchState } from '../../lib/types'

afterEach(cleanup)

// A real MatchState captured from the running API (T20, India v Australia, 1.1 overs bowled):
// guards against the hand-written fixtures drifting from what the server actually sends.
const state = real as unknown as MatchState

describe('BroadcastOverlay with a real server payload', () => {
  it('renders the score, overs and batting team from the server fields', () => {
    render(<BroadcastOverlay state={state} />)
    const inn = state.innings!
    expect(screen.getByTestId('score')).toHaveTextContent(`${inn.runs}-${inn.wickets}`)
    expect(screen.getByTestId('overs')).toHaveTextContent(inn.overs)
    expect(screen.getAllByText(inn.battingTeam.name).length).toBeGreaterThan(0)
    expect(screen.getByText(`CRR: ${inn.currentRunRate.toFixed(2)}`)).toBeInTheDocument()
  })

  it('shows the current batters and bowler', () => {
    render(<BroadcastOverlay state={state} />)
    const inn = state.innings!
    expect(screen.getAllByText(inn.striker!.name).length).toBeGreaterThan(0)
    expect(screen.getAllByText(inn.bowler!.name).length).toBeGreaterThan(0)
  })

  it('draws one timeline row per timeline over', () => {
    render(<BroadcastOverlay state={state} />)
    for (const o of state.timeline) expect(screen.getByText(`Over ${o.overNumber}`)).toBeInTheDocument()
  })

  it('uses the persisted graphics visibility', () => {
    render(<BroadcastOverlay state={state} />)
    expect(!!screen.queryByTestId('scorebug')).toBe(state.graphics.Scorebug.isVisible)
    expect(!!screen.queryByTestId('full-scorecard')).toBe(state.graphics.FullScorecard.isVisible && state.scorecard.length > 0)
  })
})
