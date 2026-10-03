import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { rowClick } from './rowClick'

function Row({ open, onEdit }: { open: () => void; onEdit: () => void }) {
  return (
    <table><tbody>
      <tr data-testid="row" onClick={rowClick(open)}>
        <td data-testid="cell">Adam Zampa</td>
        <td><button type="button" onClick={onEdit}>Edit</button></td>
        <td><a href="#x">link</a></td>
        <td><div role="menu"><button role="menuitem" type="button">Delete</button></div></td>
      </tr>
    </tbody></table>
  )
}

describe('rowClick', () => {
  it('opens when any plain part of the row is clicked', async () => {
    const open = vi.fn()
    render(<Row open={open} onEdit={() => undefined} />)
    await userEvent.click(screen.getByTestId('cell'))
    expect(open).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByTestId('row'))
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('does not open when a button, a link or a menu item inside the row is clicked', async () => {
    const open = vi.fn()
    const edit = vi.fn()
    render(<Row open={open} onEdit={edit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.click(screen.getByRole('link', { name: 'link' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(edit).toHaveBeenCalledTimes(1)          // the button still did its own job
    expect(open).not.toHaveBeenCalled()            // and the row did not open on top of it
  })

  it('does not open at the end of a text selection', async () => {
    const open = vi.fn()
    render(<Row open={open} onEdit={() => undefined} />)
    const range = document.createRange()
    range.selectNodeContents(screen.getByTestId('cell'))
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)
    // a bare click event: in a browser the selection made by dragging survives until the click that ends the drag
    fireEvent.click(screen.getByTestId('row'))
    expect(open).not.toHaveBeenCalled()
    window.getSelection()!.removeAllRanges()
    fireEvent.click(screen.getByTestId('row'))
    expect(open).toHaveBeenCalledTimes(1)          // with nothing selected the same click opens the row
  })
})
