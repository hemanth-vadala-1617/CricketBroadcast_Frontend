import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BroadcastOverlay } from './BroadcastOverlay'
import { limitedOversState, referenceState, withGraphics } from './fixtures'
import type { MatchState } from '../../lib/types'

// vitest globals are off, so Testing Library does not auto-clean between tests.
afterEach(cleanup)

describe('BroadcastOverlay - reference Test-match scorebug', () => {
  it('shows every element of the reference screenshot', () => {
    render(<BroadcastOverlay state={referenceState()} />)
    for (const text of [
      'Bangladesh', 'Australia', '355-7', '114.1', 'BOWLING', '1st Inng.: 198-10',
      'CRR: 3.11', "P'SHIP: 1(2)", 'BAN lead by 157 runs',
      'Day 3 : Session 1', 'Overs left today: 85.5', 'AUS 41%', 'DRAW 7%', 'BAN 52%',
      'BATSMAN', 'Mehidy Hasan', '34 (80)', '4s:3', '6s:0', 'SR:42.50',
      'Taijul Islam', '1 (2)', 'SR:50.00', 'BOWLER', 'Pat Cummins', '1-52 (22.1)', 'Econ:2.35',
      'TIMELINE', 'Over 114', 'Over 115', '= 1', '= 0',
    ]) expect(screen.getAllByText(text).length, text).toBeGreaterThan(0)
  })

  it('draws the timeline chips with the wicket and the single', () => {
    const { container } = render(<BroadcastOverlay state={referenceState()} />)
    expect(container.querySelector('[data-kind="Wicket"]')).toHaveTextContent('W')
    expect(container.querySelectorAll('[data-testid="timeline"] [data-kind="Dot"]').length).toBe(5)
  })

  it('marks only the striker with the bat marker', () => {
    render(<BroadcastOverlay state={referenceState()} />)
    expect(screen.getAllByTestId('strike-marker')).toHaveLength(1)
  })

  it('does not render a graphic whose visibility is off', () => {
    render(<BroadcastOverlay state={withGraphics(referenceState(), { Scorebug: false, BatterCards: false, BowlerCard: false, Timeline: false })} />)
    expect(screen.queryByTestId('scorebug')).toBeNull()
    expect(screen.queryByText('BATSMAN')).toBeNull()
    expect(screen.queryByText('BOWLER')).toBeNull()
    expect(screen.queryByTestId('timeline')).toBeNull()
  })

  it('hides the win probability strip when its graphic is off or the numbers are zero', () => {
    const { rerender } = render(<BroadcastOverlay state={withGraphics(referenceState(), { WinProbability: false })} />)
    expect(screen.queryByText('AUS 41%')).toBeNull()
    rerender(<BroadcastOverlay state={referenceState({ winProbability: { home: 0, draw: 0, away: 0 } })} />)
    expect(screen.queryByTestId('win-probability')).toBeNull()
  })

  it('shows the full scorecard and the banner only when on air', () => {
    const base = referenceState()
    expect(screen.queryByTestId('full-scorecard')).toBeNull()
    const withCard: MatchState = {
      ...withGraphics(base, { FullScorecard: true, Banner: true }),
      graphics: { ...withGraphics(base, { FullScorecard: true, Banner: true }).graphics, Banner: { isVisible: true, payload: { text: 'Happy Independence Day' } } },
      scorecard: [{
        inningsNumber: 1, battingTeam: base.homeTeam, runs: 198, wickets: 10, overs: '70.2', extras: 8, extrasText: '(b 4, w 4)', isCompleted: true,
        batting: [{ playerId: 'a', name: 'Travis Head', runs: 50, balls: 60, fours: 6, sixes: 1, strikeRate: 83.3, status: 'out', dismissalText: 'c Shanto b Taijul' }],
        bowling: [{ playerId: 'b', name: 'Taijul Islam', overs: '20.0', maidens: 2, runs: 60, wickets: 4, wides: 0, noBalls: 0, economy: 3 }],
        fallOfWickets: [{ wicketNumber: 1, score: 20, overs: '5.1', batterName: 'Travis Head' }], yetToBat: [],
      }],
    }
    render(<BroadcastOverlay state={withCard} />)
    expect(screen.getByTestId('full-scorecard')).toHaveTextContent('Travis Head')
    expect(screen.getByTestId('full-scorecard')).toHaveTextContent('c Shanto b Taijul')
    expect(screen.getByTestId('banner')).toHaveTextContent('Happy Independence Day')
  })
})

describe('BroadcastOverlay - limited overs', () => {
  it('shows target, required rate, free hit and powerplay', () => {
    render(<BroadcastOverlay state={limitedOversState()} />)
    expect(screen.getByText('Target: 181')).toBeInTheDocument()
    expect(screen.getByText('RRR : 9.40')).toBeInTheDocument()
    expect(screen.getByText('BAN need 141 runs in 90 balls')).toBeInTheDocument()
    expect(screen.getByText('FREE HIT')).toBeInTheDocument()
    expect(screen.getByText('POWERPLAY')).toBeInTheDocument()
    expect(screen.getByText('Overs 5.0/20')).toBeInTheDocument()
    expect(screen.queryByText(/Day \d/)).toBeNull()
  })

  it('omits free hit and powerplay when they are not active', () => {
    const s = limitedOversState()
    render(<BroadcastOverlay state={{ ...s, innings: { ...s.innings!, freeHit: false, powerplay: false } }} />)
    expect(screen.queryByText('FREE HIT')).toBeNull()
    expect(screen.queryByText('POWERPLAY')).toBeNull()
  })
})

describe('BroadcastOverlay - last ball box', () => {
  it('stays plain on first render and highlights when a NEW ball arrives', () => {
    const { rerender } = render(<BroadcastOverlay state={referenceState()} />)
    expect(screen.getByTestId('last-ball')).toHaveAttribute('data-highlight', 'false')
    expect(screen.getByTestId('last-ball')).not.toHaveClass('anim-pop')

    rerender(<BroadcastOverlay state={referenceState({ version: 11, lastBall: { ballId: 'b101', label: '4', kind: 'Four', runs: 4 } })} />)
    const box = screen.getByTestId('last-ball')
    expect(box).toHaveAttribute('data-highlight', 'true')
    expect(box).toHaveClass('anim-pop')
    expect(box).toHaveTextContent('4')
    expect(box).toHaveStyle({ background: '#16a34a' })
  })

  it('does not re-highlight when the same ball is re-sent', () => {
    const { rerender } = render(<BroadcastOverlay state={referenceState()} />)
    rerender(<BroadcastOverlay state={referenceState({ version: 11 })} />)
    expect(screen.getByTestId('last-ball')).toHaveAttribute('data-highlight', 'false')
  })
})

describe('BroadcastOverlay - states without live play', () => {
  it('shows the pre-match card when no innings has started', () => {
    render(<BroadcastOverlay state={referenceState({ innings: null, status: 'TossCompleted', lastBall: null, timeline: [] })} />)
    expect(screen.getByText('Match starts soon')).toBeInTheDocument()
    expect(screen.getByText('Australia won the toss and chose to bowl')).toBeInTheDocument()
    expect(screen.queryByTestId('scorebug')).toBeNull()
  })

  it('shows innings break, suspended and result cards', () => {
    const { rerender } = render(<BroadcastOverlay state={referenceState({ status: 'InningsBreak' })} />)
    expect(screen.getByText('Innings break')).toBeInTheDocument()
    expect(screen.queryByText('BATSMAN')).toBeNull()
    rerender(<BroadcastOverlay state={referenceState({ status: 'RainDelay' })} />)
    expect(screen.getByText('Play suspended')).toBeInTheDocument()
    rerender(<BroadcastOverlay state={referenceState({ status: 'Completed', resultText: 'Australia won by 10 wickets' })} />)
    expect(screen.getByText('Australia won by 10 wickets')).toBeInTheDocument()
  })

  it('shows NEW BALL DUE for a Test when flagged', () => {
    const s = referenceState()
    render(<BroadcastOverlay state={{ ...s, innings: { ...s.innings!, newBallDue: true } }} />)
    expect(screen.getByText('NEW BALL DUE')).toBeInTheDocument()
  })

  it('keeps the canvas transparent unless a background is requested', () => {
    const { rerender } = render(<BroadcastOverlay state={referenceState()} />)
    expect(screen.getByTestId('overlay-canvas')).toHaveStyle({ background: 'transparent' })
    rerender(<BroadcastOverlay state={referenceState()} showBackground />)
    expect(screen.getByTestId('overlay-canvas').style.background).toContain('gradient')
  })
})

