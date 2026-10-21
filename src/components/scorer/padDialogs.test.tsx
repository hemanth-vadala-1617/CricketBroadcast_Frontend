import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ScoringPad from './ScoringPad'

const setup = () => {
  const onAction = vi.fn()
  render(<ScoringPad disabled={false} freeHit={false} shortcuts onAction={onAction} onWicket={vi.fn()} />)
  return onAction
}

describe('wide and no-ball open as dialogs', () => {
  it('Wide opens a dialog; picking a value scores it and closes it', async () => {
    const onAction = setup()
    expect(screen.queryByRole('dialog')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Wide' }))
    const dlg = screen.getByRole('dialog', { name: 'Wide' })
    await userEvent.click(within(dlg).getByRole('button', { name: 'Wide plus 2' }))
    expect(onAction).toHaveBeenCalledWith({ kind: 'wide', extraRuns: 2 })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('No ball opens a dialog; the runs and byes are chosen there and Score no-ball sends them', async () => {
    const onAction = setup()
    await userEvent.click(screen.getByRole('button', { name: 'No ball' }))
    const dlg = screen.getByRole('dialog', { name: 'No ball' })
    await userEvent.click(within(dlg).getByRole('button', { name: '2' }))
    await userEvent.click(within(dlg).getByRole('button', { name: 'Byes' }))
    await userEvent.click(within(dlg).getAllByRole('button', { name: '3' }).at(-1)!)   // the bye count (the first 3 is runs off the bat)
    await userEvent.click(within(dlg).getByRole('button', { name: 'Score no-ball' }))
    expect(onAction).toHaveBeenCalledWith({ kind: 'noball', bat: 2, boundary: false, secondary: 'Bye', extraRuns: 3 })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Cancel closes the dialog without scoring, and the keyboard shortcuts do not score behind it', async () => {
    const onAction = setup()
    await userEvent.keyboard('d')                                   // the d shortcut opens the wide dialog
    expect(screen.getByRole('dialog', { name: 'Wide' })).toBeInTheDocument()
    await userEvent.keyboard('4')                                   // must not score a four behind the dialog
    expect(onAction).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onAction).not.toHaveBeenCalled()
  })
})
