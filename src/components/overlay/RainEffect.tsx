import { useMemo } from 'react'

export const DROPS = 160

// A small fixed-seed generator: the same rain every render (no flicker when the state updates), no Math.random in render.
function seeded(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
}

/** Falling rain over the whole 1920x1080 canvas, for a rain delay. Pure CSS animation, so it costs the browser source almost nothing. */
export function RainEffect() {
  const drops = useMemo(() => {
    const rnd = seeded(7)
    return Array.from({ length: DROPS }, (_, i) => ({
      key: i, left: Math.round(rnd() * 2100 - 100), height: Math.round(46 + rnd() * 64), width: rnd() > 0.7 ? 3 : 2,
      duration: 0.55 + rnd() * 0.5, delay: -rnd() * 1.6, opacity: 0.35 + rnd() * 0.45,
    }))
  }, [])
  return (
    <div data-testid="rain-effect" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', animation: 'rain-fade-in 1.2s ease-out both' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,23,42,.45), rgba(30,41,59,.25) 60%, rgba(15,23,42,.4))' }} />
      {drops.map((d) => (
        <span key={d.key} data-drop style={{
          position: 'absolute', top: -140, left: d.left, width: d.width, height: d.height, borderRadius: 2,
          background: 'linear-gradient(180deg, rgba(186,230,253,0), rgba(224,242,254,.95))', opacity: d.opacity,
          transform: 'rotate(12deg)', animation: `rain-fall ${d.duration}s linear ${d.delay}s infinite`,
        }} />
      ))}
    </div>
  )
}
