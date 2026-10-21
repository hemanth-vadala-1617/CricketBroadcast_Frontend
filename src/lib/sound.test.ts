import { afterEach, describe, expect, it, vi } from 'vitest'
import { playSiren, soundEnabled } from './sound'

describe('sound', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('is on unless the overlay URL says sound=0', () => {
    expect(soundEnabled('')).toBe(true)
    expect(soundEnabled('?bg=1')).toBe(true)
    expect(soundEnabled('?bg=1&sound=0')).toBe(false)
  })

  it('does nothing, without throwing, when the browser has no audio support', () => {
    expect(() => playSiren()).not.toThrow()
  })

  it('plays one steady tone when audio is available', () => {
    const freq = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), value: 0 }
    const start = vi.fn(); const stop = vi.fn()
    const node = () => { const n: Record<string, unknown> = {}; n.connect = vi.fn(() => n); return n }
    class FakeAudio {
      state = 'running'; currentTime = 0; destination = {}
      createOscillator() { return Object.assign(node(), { frequency: freq, type: '', start, stop }) }
      createBiquadFilter() { return Object.assign(node(), { frequency: { value: 0 }, type: '' }) }
      createGain() { return Object.assign(node(), { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } }) }
      resume() { return Promise.resolve() }
    }
    vi.stubGlobal('window', { ...globalThis.window, AudioContext: FakeAudio })
    vi.resetModules()
    return import('./sound').then((m) => {
      m.playSiren()
      expect(start).toHaveBeenCalledOnce()
      expect(stop).toHaveBeenCalledOnce()
      expect(freq.setValueAtTime).toHaveBeenCalledOnce()                  // one pitch...
      expect(freq.linearRampToValueAtTime).not.toHaveBeenCalled()        // ...never swept up or down
    })
  })
})
