import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Milestone, MatchState } from '../../lib/types'
import { referenceState } from './fixtures'
import { BroadcastOverlay } from './BroadcastOverlay'
import { describeMilestone } from './milestone'
import { describeSixMeter, tierFor } from './sixMeter'
import SixMeterPad from '../scorer/SixMeterPad'

const six = (meters: number | null, ballId = 'b1'): MatchState => ({ ...referenceState(), lastBall: { ballId, label: '6', kind: 'Six', runs: 6, sixDistance: meters } })
const ms = (over: Partial<Milestone>): Milestone => ({ id: 'm1', kind: 'Runs', value: 50, playerId: 'p1', name: 'Mehidy Hasan', photoUrl: null, detail: '50 (31)  5x4  1x6', ...over })

describe('six meter tiers', () => {
  it('uses 80+, 90+, 100 and 100+ ranges', () => {
    expect(tierFor(79)).toMatchObject({ tier: 'standard', badge: '' })
    expect(tierFor(80)).toMatchObject({ tier: 'eighty', badge: '80+' })
    expect(tierFor(89).tier).toBe('eighty')
    expect(tierFor(90)).toMatchObject({ tier: 'ninety', badge: '90+' })
    expect(tierFor(99).tier).toBe('ninety')
    expect(tierFor(100)).toMatchObject({ tier: 'hundred', badge: '100' })
    expect(tierFor(101)).toMatchObject({ tier: 'hundredPlus', badge: '100+' })
  })
  it('only describes a six with a distance', () => {
    expect(describeSixMeter(six(null))).toBeNull()
    expect(describeSixMeter({ ...six(90), lastBall: { ballId: 'x', label: '4', kind: 'Four', runs: 4, sixDistance: 90 } })).toBeNull()
    expect(describeSixMeter(six(94))).toMatchObject({ meters: 94, tier: 'ninety' })
  })
})

describe('six meter on screen', () => {
  it('plays when the scorer enters a distance, not for one already there, and again for a changed distance', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<BroadcastOverlay state={six(95)} />)
      expect(screen.queryByTestId('six-meter')).toBeNull()                       // already there on load
      rerender(<BroadcastOverlay state={six(null, 'b2')} />)
      rerender(<BroadcastOverlay state={six(104, 'b2')} />)
      expect(screen.getByTestId('six-meter')).toHaveAttribute('data-tier', 'hundredPlus')
      expect(screen.getByTestId('six-meter-value')).toHaveTextContent('104')
      act(() => { vi.advanceTimersByTime(5500) })
      expect(screen.queryByTestId('six-meter')).toBeNull()
      rerender(<BroadcastOverlay state={six(88, 'b2')} />)
      expect(screen.getByTestId('six-meter')).toHaveAttribute('data-tier', 'eighty')
    } finally { vi.useRealTimers() }
  })
})

describe('milestones', () => {
  it('words each kind', () => {
    expect(describeMilestone(ms({ value: 50 }))).toMatchObject({ title: 'FIFTY', tier: 'silver' })
    expect(describeMilestone(ms({ value: 100 }))).toMatchObject({ title: 'CENTURY', tier: 'gold' })
    expect(describeMilestone(ms({ value: 200 })).title).toBe('DOUBLE CENTURY')
    expect(describeMilestone(ms({ kind: 'FiveWickets', value: 5 }))).toMatchObject({ title: 'FIVE-WICKET HAUL', tier: 'red' })
    expect(describeMilestone(ms({ kind: 'Maiden', value: 1 }))).toMatchObject({ title: 'MAIDEN OVER', tier: 'green' })
  })

  it('shows each new milestone once, after the burst, and queues two that arrive together', () => {
    vi.useFakeTimers()
    try {
      const base = referenceState()
      const { rerender } = render(<BroadcastOverlay state={{ ...base, milestones: [ms({ id: 'old' })] }} />)
      expect(screen.queryByTestId('milestone-card')).toBeNull()                  // existing on load: not replayed
      const next: MatchState = { ...base, lastBall: { ballId: 'x', label: '4', kind: 'Four', runs: 4 }, milestones: [ms({ id: 'a', value: 100, name: 'Mehidy Hasan' }), ms({ id: 'b', kind: 'Maiden', value: 1, name: 'Pat Cummins' })] }
      rerender(<BroadcastOverlay state={next} />)
      expect(screen.queryByTestId('milestone-card')).toBeNull()                  // waits for the FOUR burst
      act(() => { vi.advanceTimersByTime(4100) })
      expect(screen.getByTestId('milestone-card')).toHaveAttribute('data-tier', 'gold')
      expect(screen.getByText('CENTURY')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(5600) })
      expect(screen.getByTestId('milestone-card')).toHaveAttribute('data-kind', 'Maiden')
      act(() => { vi.advanceTimersByTime(5600) })
      expect(screen.queryByTestId('milestone-card')).toBeNull()
      rerender(<BroadcastOverlay state={{ ...next }} />)                         // same ids again: nothing
      act(() => { vi.advanceTimersByTime(8000) })
      expect(screen.queryByTestId('milestone-card')).toBeNull()
    } finally { vi.useRealTimers() }
  })
})

describe('SixMeterPad', () => {
  it('sends a quick distance, an exact one, and clears', async () => {
    const onSet = vi.fn()
    const { rerender } = render(<SixMeterPad lastBall={{ ballId: 'b', label: '6', kind: 'Six', runs: 6 }} busy={false} onSet={onSet} />)
    await userEvent.click(screen.getByRole('button', { name: '90' }))
    expect(onSet).toHaveBeenLastCalledWith(90)
    await userEvent.click(screen.getByRole('button', { name: '100+' }))
    expect(onSet).toHaveBeenLastCalledWith(105)
    await userEvent.type(screen.getByLabelText('Exact distance in metres'), '97')
    await userEvent.click(screen.getByRole('button', { name: 'Show' }))
    expect(onSet).toHaveBeenLastCalledWith(97)
    rerender(<SixMeterPad lastBall={{ ballId: 'b', label: '6', kind: 'Six', runs: 6, sixDistance: 97 }} busy={false} onSet={onSet} />)
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onSet).toHaveBeenLastCalledWith(null)
  })
  it('rejects an impossible distance', async () => {
    const onSet = vi.fn()
    render(<SixMeterPad lastBall={{ ballId: 'b', label: '6', kind: 'Six', runs: 6 }} busy={false} onSet={onSet} />)
    await userEvent.type(screen.getByLabelText('Exact distance in metres'), '999')
    expect(screen.getByRole('button', { name: 'Show' })).toBeDisabled()
  })
})

describe('SixMeterPad streak note', () => {
  it('tells the scorer when the back-to-back graphic is on air', () => {
    const { rerender } = render(<SixMeterPad lastBall={{ ballId: 'b', label: '6', kind: 'Six', runs: 6, sixStreak: 1 }} busy={false} onSet={vi.fn()} />)
    expect(screen.queryByTestId('six-streak-note')).toBeNull()
    rerender(<SixMeterPad lastBall={{ ballId: 'b', label: '6', kind: 'Six', runs: 6, sixStreak: 3 }} busy={false} onSet={vi.fn()} />)
    expect(screen.getByTestId('six-streak-note')).toHaveTextContent('3 sixes in a row')
  })
})

describe('bowler hauls', () => {
  it('words a four-for and a five-for', () => {
    expect(describeMilestone(ms({ kind: 'FourWickets', value: 4 }))).toMatchObject({ title: 'FOUR-WICKET HAUL', sub: '4 WICKETS', tier: 'orange' })
    expect(describeMilestone(ms({ kind: 'FiveWickets', value: 5 }))).toMatchObject({ title: 'FIVE-WICKET HAUL', tier: 'red' })
  })

  it('draws one W badge per wicket on the card, with the bowler and his figures', async () => {
    const { MilestoneCard } = await import('./MilestoneCard')
    render(<MilestoneCard milestone={ms({ kind: 'FiveWickets', value: 5, name: 'Pat Cummins', detail: '5-24 (3.4)' })} />)
    const card = screen.getByTestId('milestone-card')
    expect(card.querySelectorAll('[data-wicket-badge]')).toHaveLength(5)
    expect(card.textContent).toContain('Pat Cummins')
    expect(card.textContent).toContain('5-24 (3.4)')
  })

  it('a batter milestone has no wicket badges', async () => {
    const { MilestoneCard } = await import('./MilestoneCard')
    render(<MilestoneCard milestone={ms({ kind: 'Runs', value: 50 })} />)
    expect(screen.queryByTestId('wicket-badges')).toBeNull()
  })
})
