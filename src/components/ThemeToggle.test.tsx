import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTheme } from '../store/useTheme'
import ThemeToggle from './ThemeToggle'

beforeEach(() => { localStorage.clear(); useTheme.setState({ mode: 'light' }) })

describe('ThemeToggle', () => {
  it('the three-way switch sets light, dark or auto', async () => {
    render(<ThemeToggle variant="segmented" />)
    await userEvent.click(screen.getByRole('radio', { name: /Dark/ }))
    expect(useTheme.getState().mode).toBe('dark')
    expect(screen.getByRole('radio', { name: /Dark/ })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(screen.getByRole('radio', { name: /Auto/ }))
    expect(useTheme.getState().mode).toBe('system')
  })

  it('the one-button version steps to the next theme and says which one it is on', async () => {
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: /Theme: Light/ }))
    expect(useTheme.getState().mode).toBe('dark')
    expect(screen.getByRole('button', { name: /Theme: Dark/ })).toBeInTheDocument()
  })
})
