import { beforeEach, describe, expect, it } from 'vitest'
import { shouldAccept, useLiveStore } from './liveMatch'
import { referenceState } from '../components/overlay/fixtures'

describe('shouldAccept (version guard)', () => {
  it('accepts anything when there is no current state', () => {
    expect(shouldAccept(null, referenceState())).toBe(true)
  })
  it('accepts a strictly newer version of the same match', () => {
    expect(shouldAccept(referenceState({ version: 5 }), referenceState({ version: 6 }))).toBe(true)
  })
  it('rejects an older or equal version of the same match', () => {
    expect(shouldAccept(referenceState({ version: 5 }), referenceState({ version: 4 }))).toBe(false)
    expect(shouldAccept(referenceState({ version: 5 }), referenceState({ version: 5 }))).toBe(false)
  })
  it('accepts a state for a different match whatever its version', () => {
    expect(shouldAccept(referenceState({ matchId: 'a', version: 99 }), referenceState({ matchId: 'b', version: 1 }))).toBe(true)
  })
})

describe('useLiveStore.apply', () => {
  beforeEach(() => useLiveStore.setState({ state: null, matchId: null, status: 'idle' }))

  it('ignores a stale message that arrives after a newer one (out-of-order delivery)', () => {
    const { apply } = useLiveStore.getState()
    apply(referenceState({ version: 7 }))
    apply(referenceState({ version: 6 }))
    expect(useLiveStore.getState().state?.version).toBe(7)
    apply(referenceState({ version: 8 }))
    expect(useLiveStore.getState().state?.version).toBe(8)
  })

  it('lets a REST response and the hub echo of the same change coexist', () => {
    const { apply } = useLiveStore.getState()
    const s = referenceState({ version: 12 })
    apply(s); apply({ ...s })
    expect(useLiveStore.getState().state?.version).toBe(12)
  })

  it('switches match cleanly', () => {
    const { apply } = useLiveStore.getState()
    apply(referenceState({ matchId: 'a', version: 50 }))
    apply(referenceState({ matchId: 'b', version: 1 }))
    expect(useLiveStore.getState().state?.matchId).toBe('b')
  })
})
