import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Truncate } from './ui'

describe('Truncate', () => {
  it('shows the full text as a tooltip and truncates it visually', () => {
    render(<Truncate text="  Indian Premier League Final Qualifier  " />)
    const el = screen.getByText('Indian Premier League Final Qualifier')
    expect(el).toHaveAttribute('title', 'Indian Premier League Final Qualifier')
    expect(el.className).toContain('truncate')
    expect(el).toHaveAttribute('tabindex', '0')
  })

  it('shows a dash with no tooltip when empty', () => {
    render(<Truncate text={null} />)
    const el = screen.getByText('—')
    expect(el).not.toHaveAttribute('title')
  })

  it('can opt out of the tab stop when inside another control', () => {
    render(<Truncate text="Rohit Sharma" focusable={false} />)
    expect(screen.getByText('Rohit Sharma')).not.toHaveAttribute('tabindex')
  })
})
