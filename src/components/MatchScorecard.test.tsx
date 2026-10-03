import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import MatchScorecard from './MatchScorecard'
import { westIndiesState } from './scorecardFixture'
import { batterName, howOut, inningsLabel, inningsNewestFirst, statusLine } from '../lib/scorecard'
import { ordinal } from '../lib/utils'
import { referenceState } from './overlay/fixtures'

describe('helpers', () => {
  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th'])
  })
  it('labels the innings buttons like the reference', () => {
    const s = westIndiesState()
    expect(s.scorecard.map(inningsLabel)).toEqual(['IND (1st Inn)', 'WI (2nd Inn)'])
    expect(inningsNewestFirst(s.scorecard).map((c) => c.inningsNumber)).toEqual([2, 1])
  })
  it('marks captain and keeper', () => {
    expect(batterName({ name: 'Shai Hope', isCaptain: true, isWicketKeeper: true })).toBe('Shai Hope (c & wk)')
    expect(batterName({ name: 'A', isCaptain: true, isWicketKeeper: false })).toBe('A (c)')
    expect(batterName({ name: 'B', isCaptain: false, isWicketKeeper: true })).toBe('B (wk)')
    expect(batterName({ name: 'C', isCaptain: false, isWicketKeeper: false })).toBe('C')
  })
  it('says how a batter got out, or that he is batting', () => {
    expect(howOut({ status: 'out', dismissalText: 'b Siraj' })).toBe('b Siraj')
    expect(howOut({ status: 'batting', dismissalText: '' })).toBe('batting')
    expect(howOut({ status: 'not out', dismissalText: '' })).toBe('not out')
  })
  it('picks the right status line', () => {
    expect(statusLine(westIndiesState())).toBe('West Indies need 80 runs in 58 balls')
    expect(statusLine({ ...westIndiesState(), resultText: 'India won by 4 runs' })).toBe('India won by 4 runs')
    expect(statusLine({ ...referenceState(), innings: null, status: 'TossCompleted', tossText: 'Australia won the toss and chose to bowl' })).toBe('Australia won the toss and chose to bowl')
    expect(statusLine({ ...referenceState(), innings: null, status: 'RainDelay', tossText: null })).toContain('rain')
  })
})

describe('MatchScorecard (the reference scorecard)', () => {
  it('shows the red status line and the newest innings first', () => {
    render(<MatchScorecard state={westIndiesState()} />)
    expect(screen.getByTestId('status-line')).toHaveTextContent('West Indies need 80 runs in 58 balls')
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['WI (2nd Inn)', 'IND (1st Inn)'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('has the green header with the score and overs', () => {
    render(<MatchScorecard state={westIndiesState()} />)
    const h = screen.getByTestId('innings-header')
    expect(h).toHaveTextContent('West Indies')
    expect(h).toHaveTextContent('272-4 (40.2 Ov)')
  })

  it('lists batters with how they got out, runs, balls, 4s, 6s and strike rate', () => {
    render(<MatchScorecard state={westIndiesState()} />)
    const rows = screen.getAllByTestId('batter-row')
    expect(rows).toHaveLength(6)
    const hope = rows[1]!
    expect(hope).toHaveTextContent('Shai Hope (c & wk)')
    expect(hope).toHaveTextContent('batting')
    expect(within(hope).getByText('111')).toBeInTheDocument()
    expect(within(hope).getByText('119')).toBeInTheDocument()
    expect(within(hope).getByText('93.28')).toBeInTheDocument()
    expect(rows[2]).toHaveTextContent('run out (Virat Kohli/Naman Dhir)')
    expect(rows[3]).toHaveTextContent('c KL Rahul b Naman Dhir')
    expect(rows[0]).toHaveTextContent('142.86')
  })

  it('shows extras, total with run rate, and yet to bat', () => {
    render(<MatchScorecard state={westIndiesState()} />)
    expect(screen.getByTestId('extras-row')).toHaveTextContent('Extras15 (b 0, lb 8, w 6, nb 1, p 0)')
    expect(screen.getByTestId('total-row')).toHaveTextContent('Total272-4 (40.2 Overs, RR: 6.74)')
    const yet = within(screen.getByTestId('yet-to-bat'))
    for (const n of ['Jewel Andrew', 'Alzarri Joseph', 'Gudakesh Motie', 'Jayden Seales', 'Vitel Lawes']) expect(yet.getByText(n)).toBeInTheDocument()
    expect(yet.getAllByRole('listitem')).toHaveLength(5)
  })

  it('has the bowling table with O M R W NB WD ECO', () => {
    render(<MatchScorecard state={westIndiesState()} />)
    for (const h of ['Bowler', 'O', 'M', 'R', 'W', 'NB', 'WD', 'ECO']) expect(screen.getAllByText(h).length).toBeGreaterThan(0)
    const row = screen.getByTestId('bowler-row')
    expect(row).toHaveTextContent('Mohammed Siraj')
    expect(row).toHaveTextContent('6.50')
    expect(row).toHaveTextContent('8.0')
  })

  it('lists the fall of wickets', () => {
    render(<MatchScorecard state={westIndiesState()} />)
    expect(screen.getByTestId('fall-of-wickets')).toHaveTextContent('17-1 (John Campbell, 1.5 ov)')
  })

  it('switches innings with the buttons', async () => {
    render(<MatchScorecard state={westIndiesState()} />)
    await userEvent.click(screen.getByRole('tab', { name: 'IND (1st Inn)' }))
    expect(screen.getByTestId('innings-header')).toHaveTextContent('India')
    expect(screen.getByTestId('innings-header')).toHaveTextContent('350-8 (50.0 Ov)')
    expect(screen.getByRole('tab', { name: 'IND (1st Inn)' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByTestId('batter-row')).toHaveLength(1)
    expect(screen.queryByTestId('yet-to-bat')).toBeNull()
  })

  it('does not crash when an older API build sends no run rate or captain flags', () => {
    const s = westIndiesState()
    const old = {
      ...s,
      scorecard: s.scorecard.map((c) => {
        const { runRate: _runRate, ...rest } = c
        return { ...rest, batting: c.batting.map(({ isCaptain: _c, isWicketKeeper: _k, ...b }) => b) }
      }),
    } as unknown as typeof s
    render(<MatchScorecard state={old} />)
    expect(screen.getByTestId('total-row')).toHaveTextContent('272-4 (40.2 Overs, RR: -)')
    expect(screen.getAllByTestId('batter-row')).toHaveLength(6)
  })

  it('says so when there is no innings yet', () => {
    render(<MatchScorecard state={{ ...referenceState(), scorecard: [], innings: null, status: 'TossCompleted', tossText: 'India won the toss and chose to bat' }} />)
    expect(screen.getByTestId('scorecard-empty')).toHaveTextContent('once the first ball is bowled')
    expect(screen.getByTestId('scorecard-empty')).toHaveTextContent('India won the toss and chose to bat')
  })
})
