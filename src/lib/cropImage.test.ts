import { describe, expect, it } from 'vitest'
import { ASPECT_CHOICES, CROP_PRESETS, extensionFor, fitOutput, toNaturalArea } from './cropImage'

describe('fitOutput', () => {
  it('never enlarges a small crop', () => {
    expect(fitOutput(300, 200, 512)).toEqual({ width: 300, height: 200 })
  })
  it('scales the longest side down to the limit and keeps the ratio', () => {
    expect(fitOutput(4000, 2250, 1920)).toEqual({ width: 1920, height: 1080 })
    expect(fitOutput(1500, 3000, 760)).toEqual({ width: 380, height: 760 })
  })
  it('never returns a zero-sized image', () => {
    expect(fitOutput(1, 5000, 100)).toEqual({ width: 1, height: 100 })
  })
})

describe('crop presets', () => {
  it('match where each picture is shown on the overlay', () => {
    expect(CROP_PRESETS.teamLogo).toMatchObject({ aspect: 1, round: true, type: 'image/png' })
    expect(CROP_PRESETS.playerPhoto.aspect).toBeCloseTo(140 / 190)            // the card photo area is 140 x 190
    expect(CROP_PRESETS.background).toMatchObject({ type: 'image/jpeg', maxSide: 1920 })
    expect(CROP_PRESETS.background.aspect).toBeCloseTo(16 / 9)
  })
  it('keep transparency for logos and cut-outs but not for backgrounds', () => {
    for (const k of ['teamLogo', 'logo', 'playerPhoto', 'watermark', 'banner'] as const) expect(CROP_PRESETS[k].type).toBe('image/png')
  })
  it('offers the common ratios', () => {
    expect(ASPECT_CHOICES.map((c) => c.label)).toEqual(['1:1', '3:4', '4:3', '16:9'])
  })
  it('names files by their real type', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg')
    expect(extensionFor('image/png')).toBe('png')
  })
})

describe('toNaturalArea (free-form selection -> original pixels)', () => {
  const natural = { width: 4000, height: 2000 }
  const shown = { width: 800, height: 400 }   // picture displayed at 1/5 size

  it('scales an on-screen pixel selection up to the original picture', () => {
    expect(toNaturalArea({ unit: 'px', x: 100, y: 50, width: 200, height: 100 }, shown, natural))
      .toEqual({ x: 500, y: 250, width: 1000, height: 500 })
  })
  it('understands percentage selections (the initial box)', () => {
    expect(toNaturalArea({ unit: '%', x: 5, y: 5, width: 90, height: 90 }, shown, natural))
      .toEqual({ x: 200, y: 100, width: 3600, height: 1800 })
  })
  it('keeps ANY ratio: a wide banner strip and a tall sliver both come through unchanged', () => {
    const strip = toNaturalArea({ unit: 'px', x: 0, y: 150, width: 800, height: 40 }, shown, natural)
    expect(strip.width / strip.height).toBeCloseTo(20)
    const sliver = toNaturalArea({ unit: 'px', x: 300, y: 0, width: 30, height: 400 }, shown, natural)
    expect(sliver.height / sliver.width).toBeCloseTo(13.33, 1)
  })
  it('never reaches outside the picture', () => {
    const a = toNaturalArea({ unit: 'px', x: 700, y: 350, width: 500, height: 500 }, shown, natural)
    expect(a.x + a.width).toBeLessThanOrEqual(natural.width)
    expect(a.y + a.height).toBeLessThanOrEqual(natural.height)
    const b = toNaturalArea({ unit: 'px', x: -50, y: -50, width: 100, height: 100 }, shown, natural)
    expect(b.x).toBe(0); expect(b.y).toBe(0)
  })
  it('never returns an empty area', () => {
    const a = toNaturalArea({ unit: 'px', x: 799, y: 399, width: 0, height: 0 }, shown, natural)
    expect(a.width).toBeGreaterThanOrEqual(1); expect(a.height).toBeGreaterThanOrEqual(1)
  })
})