import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary, isLoadFailure } from './ErrorBoundary'
import ImageCropModal from './ImageCropModal'

function Boom({ message = 'kaboom' }: { message?: string }): never { throw new Error(message) }

describe('ErrorBoundary', () => {
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => undefined) })
  afterEach(() => { vi.restoreAllMocks() })

  it('shows a message with a reload button instead of a blank page', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong on this page')
    expect(screen.getByText('kaboom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
  })

  it('explains a failed chunk / stale dev server load', () => {
    render(<ErrorBoundary><Boom message="Failed to fetch dynamically imported module: http://localhost:5173/src/x.tsx" /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded')
  })

  it('recognises load failures', () => {
    expect(isLoadFailure(new Error('Failed to fetch dynamically imported module'))).toBe(true)
    expect(isLoadFailure(new Error('504 (Outdated Optimize Dep)'))).toBe(true)
    expect(isLoadFailure(new Error('Cannot read properties of undefined'))).toBe(false)
  })

  it('clears itself when the reset key changes (navigating away)', () => {
    const { rerender } = render(<ErrorBoundary resetKey="/a"><Boom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    rerender(<ErrorBoundary resetKey="/b"><p>fine now</p></ErrorBoundary>)
    expect(screen.getByText('fine now')).toBeInTheDocument()
  })

  it('uses a custom fallback when given one', () => {
    render(<ErrorBoundary fallback={(e) => <p>custom: {e.message}</p>}><Boom message="x1" /></ErrorBoundary>)
    expect(screen.getByText('custom: x1')).toBeInTheDocument()
  })
})

describe('ImageCropModal', () => {
  beforeEach(() => {
    // jsdom has no object URLs
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })
  })

  it('opens on a picture without crashing, free ratio selected, with a Use original escape hatch', () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'logo.png', { type: 'image/png' })
    render(<ImageCropModal file={file} preset="teamLogo" onCancel={() => undefined} onConfirm={() => undefined} onUseOriginal={() => undefined} />)
    expect(screen.getByRole('dialog', { name: /Crop/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Free' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '16:9' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Use original' })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Crop & upload/ })).toBeDisabled()          // nothing selected until the picture has loaded
    expect(screen.getByAltText('Picture to crop')).toBeInTheDocument()
  })
})
