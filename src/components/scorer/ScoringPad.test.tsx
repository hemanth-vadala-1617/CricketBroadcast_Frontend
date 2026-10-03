import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ScoringPad from './ScoringPad'

const base = { disabled: false, freeHit: false, shortcuts: true }

describe('ScoringPad keyboard shortcuts', () => {
  it('scores runs, boundaries, wicket, swap and undo', () => {
    const onAction = vi.fn(); const onWicket = vi.fn(); const onSwap = vi.fn(); const onUndo = vi.fn()
    render(<ScoringPad {...base} onAction={onAction} onWicket={onWicket} onSwap={onSwap} onUndo={onUndo} />)
    fireEvent.keyDown(window, { key: '4' })
    fireEvent.keyDown(window, { key: '1' })
    fireEvent.keyDown(window, { key: 'w' })
    fireEvent.keyDown(window, { key: 's' })
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(onAction).toHaveBeenNthCalledWith(1, { kind: 'runs', runs: 4, boundary: true })
    expect(onAction).toHaveBeenNthCalledWith(2, { kind: 'runs', runs: 1, boundary: false })
    expect(onWicket).toHaveBeenCalledOnce(); expect(onSwap).toHaveBeenCalledOnce(); expect(onUndo).toHaveBeenCalledOnce()
  })

  it('always calls the latest handler, not the one from the first render', () => {
    const first = vi.fn(); const second = vi.fn()
    const { rerender } = render(<ScoringPad {...base} onAction={first} onWicket={vi.fn()} />)
    rerender(<ScoringPad {...base} onAction={second} onWicket={vi.fn()} />)
    fireEvent.keyDown(window, { key: '6' })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith({ kind: 'runs', runs: 6, boundary: true })
  })

  it('ignores keys while typing, when disabled, or when shortcuts are off', () => {
    const onAction = vi.fn()
    const { rerender, container } = render(<><input aria-label="reason" /><ScoringPad {...base} onAction={onAction} onWicket={vi.fn()} /></>)
    fireEvent.keyDown(container.querySelector('input')!, { key: '2' })
    rerender(<><input aria-label="reason" /><ScoringPad {...base} disabled onAction={onAction} onWicket={vi.fn()} /></>)
    fireEvent.keyDown(window, { key: '2' })
    rerender(<><input aria-label="reason" /><ScoringPad {...base} shortcuts={false} onAction={onAction} onWicket={vi.fn()} /></>)
    fireEvent.keyDown(window, { key: '2' })
    expect(onAction).not.toHaveBeenCalled()
  })
})
