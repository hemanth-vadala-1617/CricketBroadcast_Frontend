import { describe, expect, it } from 'vitest'
import { actionLabel, buildBall, canNonStrikerBeOut, createIdempotency, DISMISSALS, fielderNeed, isDismissalAllowed, validateWicket } from './buildRequest'

const id = 'req-1'

describe('buildBall', () => {
  it('plain runs: 4 and 6 are boundaries, 4 run is not', () => {
    expect(buildBall({ kind: 'runs', runs: 4, boundary: true }, id)).toMatchObject({ runsBat: 4, isBoundary: true, extrasType: 'None' })
    expect(buildBall({ kind: 'runs', runs: 6 }, id).isBoundary).toBe(true)
    expect(buildBall({ kind: 'runs', runs: 4 }, id).isBoundary).toBe(false)
    expect(buildBall({ kind: 'runs', runs: 5 }, id)).toMatchObject({ runsBat: 5, isBoundary: false })
  })

  it('wide and wide+boundary', () => {
    expect(buildBall({ kind: 'wide', extraRuns: 0 }, id)).toMatchObject({ extrasType: 'Wide', extraRuns: 0, runsBat: 0 })
    expect(buildBall({ kind: 'wide', extraRuns: 4, boundary: true }, id)).toMatchObject({ extrasType: 'Wide', extraRuns: 4, isBoundary: true })
  })

  it('no-ball with bat runs, and with byes / leg-byes', () => {
    expect(buildBall({ kind: 'noball', bat: 4, boundary: true }, id)).toMatchObject({ extrasType: 'NoBall', runsBat: 4, isBoundary: true, secondaryExtrasType: 'None', extraRuns: 0 })
    expect(buildBall({ kind: 'noball', bat: 0, secondary: 'Bye', extraRuns: 2 }, id)).toMatchObject({ extrasType: 'NoBall', secondaryExtrasType: 'Bye', extraRuns: 2 })
    expect(buildBall({ kind: 'noball', bat: 0, secondary: 'LegBye', extraRuns: 1 }, id)).toMatchObject({ secondaryExtrasType: 'LegBye', extraRuns: 1 })
    // a secondary type without runs is dropped; runs without a secondary type are dropped
    expect(buildBall({ kind: 'noball', bat: 1, secondary: 'Bye', extraRuns: 0 }, id).secondaryExtrasType).toBe('None')
    expect(buildBall({ kind: 'noball', bat: 1, extraRuns: 3 }, id).extraRuns).toBe(0)
    expect(buildBall({ kind: 'noball', bat: 6 }, id).isBoundary).toBe(true)
  })

  it('bye and leg-bye never put runs on the bat', () => {
    expect(buildBall({ kind: 'bye', runs: 2 }, id)).toMatchObject({ extrasType: 'Bye', extraRuns: 2, runsBat: 0 })
    expect(buildBall({ kind: 'legbye', runs: 4, boundary: true }, id)).toMatchObject({ extrasType: 'LegBye', extraRuns: 4, isBoundary: true })
  })

  it('wicket: striker bowled, run-out of the non-striker with a run, stumped off a wide', () => {
    expect(buildBall({ kind: 'wicket', dismissal: 'Bowled', newBatterId: 'nb' }, id).wicket).toEqual({ dismissalType: 'Bowled', dismissedPlayerId: null, fielderId: null, newBatterId: 'nb' })
    const ro = buildBall({ kind: 'wicket', dismissal: 'RunOut', dismissedPlayerId: 'ns', fielderId: 'f', runs: 1 }, id)
    expect(ro).toMatchObject({ runsBat: 1, extrasType: 'None' })
    expect(ro.wicket).toMatchObject({ dismissalType: 'RunOut', dismissedPlayerId: 'ns', fielderId: 'f', newBatterId: null })
    expect(buildBall({ kind: 'wicket', dismissal: 'Stumped', fielderId: 'wk', ballType: 'Wide' }, id)).toMatchObject({ extrasType: 'Wide' })
  })

  it('always carries the clientRequestId', () => {
    expect(buildBall({ kind: 'runs', runs: 1 }, 'abc').clientRequestId).toBe('abc')
  })
})

describe('dismissal rules', () => {
  it('free hit allows only run out / handled / obstructing', () => {
    const allowed = DISMISSALS.filter((d) => isDismissalAllowed(d.type, true)).map((d) => d.type)
    expect(allowed).toEqual(['RunOut', 'HandledBall', 'ObstructingField'])
    expect(DISMISSALS.every((d) => isDismissalAllowed(d.type, false))).toBe(true)
  })
  it('wide allows stumped but not bowled; no-ball allows run out only of the common ones', () => {
    expect(isDismissalAllowed('Stumped', false, 'Wide')).toBe(true)
    expect(isDismissalAllowed('Bowled', false, 'Wide')).toBe(false)
    expect(isDismissalAllowed('Stumped', false, 'NoBall')).toBe(false)
    expect(isDismissalAllowed('RunOut', true, 'NoBall')).toBe(true)
  })
  it('non-striker only for run out / obstructing; fielder need per type', () => {
    expect(canNonStrikerBeOut('RunOut')).toBe(true)
    expect(canNonStrikerBeOut('ObstructingField')).toBe(true)
    expect(canNonStrikerBeOut('Bowled')).toBe(false)
    expect(fielderNeed('Caught')).toBe('required')
    expect(fielderNeed('Stumped')).toBe('required')
    expect(fielderNeed('RunOut')).toBe('optional')
    expect(fielderNeed('LBW')).toBe('none')
  })
  it('validateWicket', () => {
    expect(validateWicket({ kind: 'wicket', dismissal: 'Caught' }, 's', 'n')).toMatch(/fielder/)
    expect(validateWicket({ kind: 'wicket', dismissal: 'Stumped' }, 's', 'n')).toMatch(/keeper/)
    expect(validateWicket({ kind: 'wicket', dismissal: 'Caught', fielderId: 'f' }, 's', 'n')).toBeNull()
    expect(validateWicket({ kind: 'wicket', dismissal: 'Bowled', dismissedPlayerId: 'n' }, 's', 'n')).toMatch(/non-striker/)
    expect(validateWicket({ kind: 'wicket', dismissal: 'RunOut', dismissedPlayerId: 'n' }, 's', 'n')).toBeNull()
  })
})

describe('labels', () => {
  it('summarises actions', () => {
    expect(actionLabel({ kind: 'wide', extraRuns: 0 })).toBe('WD')
    expect(actionLabel({ kind: 'wide', extraRuns: 2 })).toBe('WD+2')
    expect(actionLabel({ kind: 'noball', bat: 4 })).toBe('NB+4')
    expect(actionLabel({ kind: 'bye', runs: 1 })).toBe('B1')
  })
})

describe('idempotency', () => {
  const make = () => { let n = 0; return createIdempotency(() => `id-${++n}`) }

  it('reuses the id for an identical retry after a network failure', () => {
    const k = make()
    const first = k.idFor('four')
    k.settle('four', 'network')
    expect(k.idFor('four')).toBe(first)
  })
  it('issues a new id after success or a server rejection', () => {
    const k = make()
    const a = k.idFor('four'); k.settle('four', 'ok')
    const b = k.idFor('four'); k.settle('four', 'rejected')
    const c = k.idFor('four')
    expect(new Set([a, b, c]).size).toBe(3)
  })
  it('does not reuse the id for a different action', () => {
    const k = make()
    const a = k.idFor('four'); k.settle('four', 'network')
    const b = k.idFor('six')
    expect(b).not.toBe(a)
    expect(k.idFor('four')).not.toBe(a)   // the pending slot moved on to "six"
  })
  it('keeps the id across repeated network failures', () => {
    const k = make()
    const a = k.idFor('x'); k.settle('x', 'network'); k.idFor('x'); k.settle('x', 'network')
    expect(k.idFor('x')).toBe(a)
  })
})
