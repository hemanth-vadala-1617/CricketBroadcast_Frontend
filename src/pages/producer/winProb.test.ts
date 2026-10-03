import { describe, expect, it } from 'vitest'
import { normalise } from './winProb'

describe('normalise win probability', () => {
  it('always adds up to 100 in a Test', () => {
    for (const p of [{ home: 60, draw: 30, away: 30 }, { home: 10, draw: 90, away: 90 }, { home: 0, draw: 0, away: 0 }]) {
      for (const k of ['home', 'draw', 'away'] as const) {
        const n = normalise(p, k, true)
        expect(n.home + n.draw + n.away).toBe(100)
        expect(n[k]).toBe(p[k])
      }
    }
  })
  it('splits the remainder in proportion to the others', () => {
    expect(normalise({ home: 50, draw: 10, away: 30 }, 'home', true)).toEqual({ home: 50, draw: 13, away: 37 })
  })
  it('splits evenly when the others are zero', () => {
    expect(normalise({ home: 40, draw: 0, away: 0 }, 'home', true)).toEqual({ home: 40, draw: 30, away: 30 })
  })
  it('keeps draw at 0 in limited overs', () => {
    expect(normalise({ home: 70, draw: 5, away: 5 }, 'home', false)).toEqual({ home: 70, draw: 0, away: 30 })
    expect(normalise({ home: 5, draw: 0, away: 80 }, 'away', false)).toEqual({ home: 20, draw: 0, away: 80 })
  })
  it('clamps out-of-range values', () => {
    expect(normalise({ home: 150, draw: 0, away: 0 }, 'home', true).home).toBe(100)
  })
})
