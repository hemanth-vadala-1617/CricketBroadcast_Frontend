import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MatchBreak } from '../../lib/types'
import BreaksCard from '../scorer/BreaksCard'
import { BreakCard } from './BreakCard'
import { breakLook, breakOptions, clockFor, formatClock } from './breaks'
import { limitedOversState } from './fixtures'

const brk = (over: Partial<MatchBreak> = {}): MatchBreak => ({ kind: 'DrinksBreak', label: 'Drinks break', plannedSeconds: 300, elapsedSeconds: 0, ...over })

describe('break helpers', () => {
  it('offers the strategic timeout in short formats and lunch, tea and stumps in a Test', () => {
    const t20 = breakOptions(false).map((o) => o.kind)
    expect(t20).toEqual(expect.arrayContaining(['StrategicTimeout', 'DrinksBreak', 'RainDelay', 'BadLight', 'InjuryBreak']))
    expect(t20).not.toContain('Lunch')
    const test = breakOptions(true).map((o) => o.kind)
    expect(test).toEqual(expect.arrayContaining(['Lunch', 'Tea', 'Stumps', 'DrinksBreak', 'RainDelay']))
    expect(test).not.toContain('StrategicTimeout')
  })

  it('formats clocks, counts down a planned break and counts up an open one', () => {
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(3725)).toBe('1:02:05')
    expect(clockFor({ plannedSeconds: 300 }, 90)).toEqual({ text: '3:30', label: 'REMAINING', overrun: false })
    expect(clockFor({ plannedSeconds: 300 }, 330)).toEqual({ text: '+0:30', label: 'OVER TIME', overrun: true })
    expect(clockFor({ plannedSeconds: 0 }, 125)).toEqual({ text: '2:05', label: 'ELAPSED', overrun: false })
  })

  it('has its own wording for each kind and a fallback', () => {
    expect(breakLook('StrategicTimeout', 'Strategic timeout').subtitle).toMatch(/huddle/i)
    expect(breakLook('Stumps', 'Stumps').subtitle).toMatch(/close of play/i)
    expect(breakLook('Mystery', '').title).toBe('Play paused')
  })
})

describe('BreakCard on the overlay', () => {
  it('shows the label, a counting-down clock and the score to come back to', () => {
    vi.useFakeTimers()
    try {
      render(<BreakCard state={limitedOversState()} brk={brk({ elapsedSeconds: 60 })} />)
      const card = screen.getByTestId('break-card')
      expect(card).toHaveAttribute('data-kind', 'DrinksBreak')
      expect(card.textContent).toContain('Drinks break')
      expect(screen.getByTestId('break-clock')).toHaveTextContent('4:00')
      act(() => { vi.advanceTimersByTime(5000) })
      expect(screen.getByTestId('break-clock')).toHaveTextContent('3:55')
      expect(card.textContent).toContain('40-1 (5.0)')
    } finally { vi.useRealTimers() }
  })
})

describe('BreaksCard in the scorer console', () => {
  it('starts a break of the usual length, or of the length typed', async () => {
    const onStart = vi.fn()
    render(<BreaksCard isTest={false} current={null} canStart busy={false} onStart={onStart} onResume={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Strategic timeout/ }))
    expect(onStart).toHaveBeenLastCalledWith('StrategicTimeout', null)
    await userEvent.type(screen.getByLabelText('Break length in minutes'), '7')
    await userEvent.click(screen.getByRole('button', { name: /Drinks break/ }))
    expect(onStart).toHaveBeenLastCalledWith('DrinksBreak', 7)
  })

  it('shows what is on and a Resume button during a break, and nothing when a break cannot start', async () => {
    const onResume = vi.fn()
    const { rerender, container } = render(<BreaksCard isTest={false} current={brk()} canStart={false} busy={false} onStart={vi.fn()} onResume={onResume} />)
    expect(screen.getByRole('status')).toHaveTextContent('Drinks break')
    await userEvent.click(screen.getByRole('button', { name: 'Resume play' }))
    expect(onResume).toHaveBeenCalledOnce()
    rerender(<BreaksCard isTest={false} current={null} canStart={false} busy={false} onStart={vi.fn()} onResume={onResume} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('offers lunch and tea in a Test', () => {
    render(<BreaksCard isTest current={null} canStart busy={false} onStart={vi.fn()} onResume={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Lunch/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tea/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Strategic timeout/ })).toBeNull()
  })
})
