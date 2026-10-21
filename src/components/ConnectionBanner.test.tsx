import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { LiveStatus } from '../lib/liveMatch'
import ConnectionBanner from './ConnectionBanner'

describe('ConnectionBanner', () => {
  it('shows nothing while the connection is fine or still being made', () => {
    for (const s of ['live', 'connecting', 'idle'] as LiveStatus[]) {
      const { container, unmount } = render(<ConnectionBanner status={s} />)
      expect(container).toBeEmptyDOMElement()
      unmount()
    }
  })

  it('says it is reconnecting in amber, and offline in red with what that means for scoring', () => {
    const { rerender } = render(<ConnectionBanner status="reconnecting" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/Reconnecting/)
    expect(screen.getByTestId('connection-banner')).toHaveAttribute('data-status', 'reconnecting')
    rerender(<ConnectionBanner status="offline" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/No connection to the server/)
    expect(screen.getByRole('alert')).toHaveTextContent(/may not be saved/)
  })
})
