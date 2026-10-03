import type { BallKind } from '../../lib/types'

// The small last-ball box has its OWN motion, deliberately different from the big full-screen bursts
// (EventBurst): the burst slides, zooms and shakes; the box flips, rolls, glitches and blinks.
export type Flair = 'ring' | 'foil' | 'glitch' | 'march'

export interface BallStyle {
  bg: string          // box background while highlighted (dark, so it never looks like the burst's coloured stripe)
  fg: string          // label colour while highlighted
  glow: string        // outer glow colour
  border: string      // border colour (kept after the highlight as a quiet reminder of the event)
  flair: Flair
  intro: string       // CSS animation for the label inside the box
}

export const BALL_STYLES: Partial<Record<BallKind, BallStyle>> = {
  // FOUR: the number flips like a flip-clock; a green pulse ring and a gleam sweep around it
  Four: { bg: '#052e16', fg: '#ffffff', glow: '#4ade80', border: '#86efac', flair: 'ring', intro: 'lb-flip3d .6s cubic-bezier(.2,.8,.3,1.1) both' },
  // SIX: the number rolls up like an odometer (0 to 6) in shimmering gold foil, with sparks flying out
  Six: { bg: '#1e1b4b', fg: '#fde047', glow: '#facc15', border: '#fde047', flair: 'foil', intro: 'lb-reel .95s cubic-bezier(.15,.85,.25,1) both' },
  // OUT: the letter glitches (colour-split flicker) under scanlines on a dark red box
  Wicket: { bg: '#2a0a0a', fg: '#fecaca', glow: '#f87171', border: '#fecaca', flair: 'glitch', intro: 'lb-glitch .9s steps(1, end) both' },
  // NO BALL / WIDE: the label blinks while hazard stripes march across the box
  NoBall: { bg: '#1c1917', fg: '#fbbf24', glow: '#fbbf24', border: '#fde68a', flair: 'march', intro: 'lb-blink .5s steps(1, end) 4 both' },
  Wide: { bg: '#1c1917', fg: '#fbbf24', glow: '#fbbf24', border: '#fde68a', flair: 'march', intro: 'lb-blink .5s steps(1, end) 4 both' },
}

export function ballStyle(kind: BallKind | undefined): BallStyle | null {
  return (kind && BALL_STYLES[kind]) || null
}

// Sparks thrown out of a six: evenly spaced directions, alternating short and long throws.
export function sparkVectors(count = 10): { dx: number; dy: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    const dist = i % 2 === 0 ? 120 : 82
    return { dx: Math.round(Math.cos(angle) * dist), dy: Math.round(Math.sin(angle) * dist * 0.55) }
  })
}

// The numbers an odometer rolls through to land on `label` ("6" -> 0..6). Not a plain number -> no reel.
export function reelDigits(label: string): string[] | null {
  if (!/^\d$/.test(label)) return null
  return Array.from({ length: Number(label) + 1 }, (_, i) => String(i))
}
