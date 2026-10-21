import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PowerSurge } from '../../lib/types'
import PowerSurgeCard from './PowerSurgeCard'

const surge = (over: Partial<PowerSurge>): PowerSurge => ({ active: false, used: false, canStart: true, canCancel: false, startOver: 0, overs: 2, oversLeft: 0, pending: false, earliestOver: 1, latestOver: 19, nextStartOver: 8, ...over })

describe('PowerSurgeCard', () => {
  it('offers a one-tap start for 2 overs and says which over it begins with', async () => {
    const onStart = vi.fn()
    render(<PowerSurgeCard surge={surge({})} busy={false} onStart={onStart} onCancel={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Start Power Surge · 2 overs/ }))
    expect(onStart).toHaveBeenCalledOnce()
    expect(screen.getByText(/Begins with over 8/)).toBeInTheDocument()
  })

  it('shows the overs left while it is on, and offers a cancel only when allowed', async () => {
    const onCancel = vi.fn()
    const { rerender } = render(<PowerSurgeCard surge={surge({ canStart: false, used: true, active: true, oversLeft: 2, startOver: 8 })} busy={false} onStart={vi.fn()} onCancel={onCancel} />)
    expect(screen.getByRole('status')).toHaveTextContent('On air: 2 overs left')
    expect(screen.queryByRole('button', { name: 'Cancel Power Surge' })).toBeNull()
    rerender(<PowerSurgeCard surge={surge({ canStart: false, used: true, pending: true, canCancel: true, startOver: 9 })} busy={false} onStart={vi.fn()} onCancel={onCancel} />)
    expect(screen.getByRole('status')).toHaveTextContent('Starts with over 9')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel Power Surge' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('explains when it cannot start, and when it has been used', () => {
    const { rerender } = render(<PowerSurgeCard surge={surge({ canStart: false, earliestOver: 11, latestOver: 16 })} busy={false} onStart={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/from over 11 to over 16/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Start Power Surge/ })).toBeNull()
    rerender(<PowerSurgeCard surge={surge({ canStart: false, used: true, startOver: 12 })} busy={false} onStart={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/Used this innings \(from over 12\)/)).toBeInTheDocument()
  })
})
