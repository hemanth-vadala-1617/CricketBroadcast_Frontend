import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ActionMenu, Modal } from './ui'

const open = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Actions for Sample Series' }))
}

function setup(over: { view?: () => void; edit?: () => void; del?: () => void; hideEdit?: boolean } = {}) {
  const view = over.view ?? vi.fn()
  const edit = over.edit ?? vi.fn()
  const del = over.del ?? vi.fn()
  render(
    <div>
      <p>outside</p>
      <ActionMenu label="Actions for Sample Series" items={[
        { label: 'View', onSelect: view },
        { label: 'Edit', onSelect: edit, hidden: over.hideEdit },
        { label: 'Delete', onSelect: del, danger: true },
      ]} />
    </div>,
  )
  return { view, edit, del }
}

describe('ActionMenu', () => {
  it('opens on click, lists the items, and closes when the button is clicked again', async () => {
    setup()
    expect(screen.queryByRole('menu')).toBeNull()
    const button = screen.getByRole('button', { name: 'Actions for Sample Series' })
    expect(button).toHaveAttribute('aria-haspopup', 'menu')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await open()
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['View', 'Edit', 'Delete'])
    await userEvent.click(button)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('calls onSelect for the chosen item and closes', async () => {
    const { view, edit, del } = setup()
    await open()
    await userEvent.click(screen.getByRole('menuitem', { name: 'View' }))
    expect(view).toHaveBeenCalledTimes(1)
    expect(edit).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('shows the delete item in red', async () => {
    setup()
    await open()
    expect(screen.getByRole('menuitem', { name: 'Delete' }).className).toContain('text-red-600')
    expect(screen.getByRole('menuitem', { name: 'View' }).className).not.toContain('text-red-600')
  })

  it('leaves out hidden items', async () => {
    setup({ hideEdit: true })
    await open()
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['View', 'Delete'])
  })

  it('renders nothing when every item is hidden', () => {
    const { container } = render(<ActionMenu label="none" items={[{ label: 'Edit', hidden: true }]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('closes on an outside click', async () => {
    setup()
    await open()
    await userEvent.click(screen.getByText('outside'))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('moves focus with the arrow keys (wrapping), Home and End', async () => {
    setup()
    await open()
    const [view, edit, del] = screen.getAllByRole('menuitem')
    expect(view).toHaveFocus()                       // first item takes focus on open
    await userEvent.keyboard('{ArrowDown}')
    expect(edit).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(del).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(view).toHaveFocus()                       // wraps around
    await userEvent.keyboard('{ArrowUp}')
    expect(del).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(view).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(del).toHaveFocus()
  })

  it('opens from the keyboard with ArrowDown', async () => {
    setup()
    screen.getByRole('button', { name: 'Actions for Sample Series' }).focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('Escape closes the menu and returns focus to its button', async () => {
    setup()
    await open()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.getByRole('button', { name: 'Actions for Sample Series' })).toHaveFocus()
  })

  it('Escape closes ONLY the menu; the dialog behind it stays until the next Escape', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Details">
        <ActionMenu label="Actions for Sample Series" items={[{ label: 'View' }]} />
      </Modal>,
    )
    await open()
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('is attached to <body>, so a table with overflow cannot clip it', async () => {
    setup()
    await open()
    expect(screen.getByRole('menu').parentElement).toBe(document.body)
    expect(screen.getByRole('menu').style.position).toBe('fixed')
  })
})
