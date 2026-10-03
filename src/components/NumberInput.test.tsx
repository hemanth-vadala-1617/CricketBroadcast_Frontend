import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { NumberInput } from './ui'
import { caretAfterDigits, formatIndianNumber, parseWholeNumber } from '../lib/utils'

function Harness({ start = 0, max, grouped, min }: { start?: number; max?: number; grouped?: boolean; min?: number }) {
  const [v, setV] = useState(start)
  return <><NumberInput aria-label="Capacity" value={v} onValueChange={setV} max={max} grouped={grouped} min={min} /><output data-testid="value">{v}</output></>
}

describe('helpers', () => {
  it('groups the Indian way', () => {
    expect(formatIndianNumber(0)).toBe('0')
    expect(formatIndianNumber(999)).toBe('999')
    expect(formatIndianNumber(33500)).toBe('33,500')
    expect(formatIndianNumber(100000)).toBe('1,00,000')
    expect(formatIndianNumber(12345678)).toBe('1,23,45,678')
  })
  it('keeps digits only and drops leading zeros', () => {
    expect(parseWholeNumber('033500')).toBe(33500)
    expect(parseWholeNumber('1,00,000')).toBe(100000)
    expect(parseWholeNumber('abc')).toBeNull()
    expect(parseWholeNumber('')).toBeNull()
    expect(parseWholeNumber('0')).toBe(0)
    expect(parseWholeNumber('5000', 999)).toBe(999)
  })
  it('puts the caret after the Nth digit even with commas', () => {
    expect(caretAfterDigits('1,00,000', 3)).toBe(4)
    expect(caretAfterDigits('1,00,000', 6)).toBe(8)
    expect(caretAfterDigits('1,00,000', 0)).toBe(0)
    expect(caretAfterDigits('12', 9)).toBe(2)
  })
})

describe('NumberInput', () => {
  it('shows 1,00,000 as the digits are typed and reports the plain number', async () => {
    render(<Harness />)
    const input = screen.getByLabelText('Capacity')
    await userEvent.clear(input)
    await userEvent.type(input, '100000')
    expect(input).toHaveValue('1,00,000')
    expect(screen.getByTestId('value')).toHaveTextContent('100000')
  })

  it('never keeps a leading zero (033500 -> 33,500)', async () => {
    render(<Harness />)
    const input = screen.getByLabelText('Capacity')
    await userEvent.clear(input)
    await userEvent.type(input, '033500')
    expect(input).toHaveValue('33,500')
    expect(screen.getByTestId('value')).toHaveTextContent('33500')
  })

  it('typing over the initial 0 does not leave it in front', async () => {
    render(<Harness start={0} />)
    const input = screen.getByLabelText('Capacity')
    await userEvent.type(input, '7')           // caret goes to the end of "0"
    expect(input).toHaveValue('7')
  })

  it('ignores letters and accepts a pasted formatted number', async () => {
    render(<Harness />)
    const input = screen.getByLabelText('Capacity')
    await userEvent.clear(input)
    await userEvent.type(input, 'a1b2')
    expect(input).toHaveValue('12')
    await userEvent.clear(input)
    await userEvent.click(input)
    await userEvent.paste('1,23,456')
    expect(input).toHaveValue('1,23,456')
  })

  it('can be cleared while editing and falls back to the minimum on blur', async () => {
    render(<Harness start={50} min={1} />)
    const input = screen.getByLabelText('Capacity')
    await userEvent.clear(input)
    expect(input).toHaveValue('')
    await userEvent.tab()
    expect(input).toHaveValue('1')
  })

  it('respects a maximum and plain (ungrouped) mode', async () => {
    render(<Harness max={999} grouped={false} />)
    const input = screen.getByLabelText('Capacity')
    await userEvent.clear(input)
    await userEvent.type(input, '12345')
    expect(input).toHaveValue('999')
  })

  it('keeps the caret in place when a comma appears mid-edit', async () => {
    render(<Harness start={12345} />)
    const input = screen.getByLabelText('Capacity') as HTMLInputElement   // shows 12,345
    await userEvent.click(input)
    input.setSelectionRange(1, 1)                                         // after the "1"
    await userEvent.keyboard('9')                                         // 192345 -> 1,92,345 with caret after the 9
    expect(input).toHaveValue('1,92,345')
    expect(input.selectionStart).toBe(caretAfterDigits('1,92,345', 2))
  })
})