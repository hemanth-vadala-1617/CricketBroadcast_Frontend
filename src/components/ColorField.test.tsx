import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ColorField, normaliseHex } from './ui'

describe('normaliseHex', () => {
  it('accepts codes with or without #, in either case, and the short form', () => {
    expect(normaliseHex('#0F6B4F')).toBe('#0f6b4f')
    expect(normaliseHex('0f6b4f')).toBe('#0f6b4f')
    expect(normaliseHex('  #fa0 ')).toBe('#ffaa00')
  })
  it('rejects anything else', () => {
    for (const bad of ['', '#12', '#12345', '#1234567', 'red', '#ggg000']) expect(normaliseHex(bad)).toBeNull()
  })
})

describe('ColorField', () => {
  it('commits a pasted code and shows the typed text until blur', async () => {
    const onChange = vi.fn()
    render(<ColorField label="Primary" value="#0f6b4f" onChange={onChange} />)
    const box = screen.getByLabelText('Primary')
    expect(box).toHaveValue('#0f6b4f')
    await userEvent.clear(box)
    await userEvent.type(box, 'FFD400')
    expect(onChange).toHaveBeenLastCalledWith('#ffd400')
  })

  it('flags an invalid code, does not commit it, and restores the value on blur', async () => {
    const onChange = vi.fn()
    render(<ColorField label="Primary" value="#0f6b4f" onChange={onChange} />)
    const box = screen.getByLabelText('Primary')
    await userEvent.clear(box)
    await userEvent.type(box, 'zz')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.blur(box)
    expect(box).toHaveValue('#0f6b4f')
  })
})
