import { useEffect, useRef, useState } from 'react'
import type { MatchState } from '../../lib/types'
import { SIX_METER_MS, describeSixMeter, type SixMeter, type SixTier } from './sixMeter'

/** Plays once for each NEW distance on a six: not for the one already there on load, nor for one that returns after an undo. */
export function useSixMeter(state: MatchState, enabled: boolean): SixMeter | null {
  const meter = describeSixMeter(state)
  const id = meter?.id ?? null
  const seen = useRef<Set<string> | null>(null)
  seen.current ??= new Set(id ? [id] : [])
  const [shown, setShown] = useState<SixMeter | null>(null)
  useEffect(() => {
    if (!meter || !id || seen.current!.has(id)) return
    seen.current!.add(id)
    if (!enabled) return
    setShown(meter)
    const t = window.setTimeout(() => setShown(null), SIX_METER_MS)
    return () => window.clearTimeout(t)
    // decided by the id only; later state versions must not restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, enabled])
  return shown
}

const PALETTE: Record<SixTier, { dark: string; mid: string; light: string; text: string }> = {
  standard: { dark: '#172554', mid: '#1d4ed8', light: '#7dd3fc', text: '#fff' },
  eighty: { dark: '#431407', mid: '#c2410c', light: '#fdba74', text: '#fff' },
  ninety: { dark: '#0f172a', mid: '#475569', light: '#e2e8f0', text: '#fff' },
  hundred: { dark: '#422006', mid: '#a16207', light: '#fde047', text: '#fff' },
  hundredPlus: { dark: '#3b0764', mid: '#a21caf', light: '#fde047', text: '#fff' },
}

/** IPL-style "six meter": the distance in big numbers on a tiered, metal-coloured plate. */
export function SixMeterCard({ meter }: { meter: SixMeter }) {
  const c = PALETTE[meter.tier]
  const top = meter.tier === 'hundredPlus' || meter.tier === 'hundred'
  return (
    <div data-testid="six-meter" data-tier={meter.tier} style={{ position: 'absolute', left: 0, top: 410, width: 1360, height: 250, animation: `sm-in ${SIX_METER_MS}ms cubic-bezier(.2,.9,.3,1) both`, filter: 'drop-shadow(0 16px 34px rgba(0,0,0,.6))' }}>
      {top && <div aria-hidden style={{ position: 'absolute', left: -120, top: -270, width: 790, height: 790, borderRadius: '50%', background: `repeating-conic-gradient(${c.light}cc 0 6deg, transparent 6deg 20deg)`, WebkitMaskImage: 'radial-gradient(circle, #000 15%, transparent 68%)', maskImage: 'radial-gradient(circle, #000 15%, transparent 68%)', animation: 'lb-rays 6s linear infinite' }} />}
      <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0 100%)', background: `linear-gradient(100deg, ${c.dark}, ${c.mid} 55%, ${c.dark})`, borderBottom: `6px solid ${c.light}` }}>
        <span aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 140, background: `linear-gradient(105deg, transparent, ${c.light}66, transparent)`, animation: 'lb-gleam 2.4s ease-in-out .6s 2' }} />
      </div>
      {meter.badge && (
        <div className="font-display" style={{ position: 'absolute', left: 36, top: 36, width: 178, height: 178, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 84, fontWeight: 700, color: c.dark, background: `radial-gradient(circle at 32% 28%, #fff, ${c.light} 55%, ${c.mid})`, boxShadow: `0 0 0 8px ${c.dark}, 0 0 40px ${c.light}`, animation: top ? 'lb-pulse 1.1s ease-in-out infinite' : undefined }}>{meter.badge}</div>
      )}
      <div className="font-display" style={{ position: 'absolute', left: meter.badge ? 260 : 70, top: 18, right: 150, color: c.text, lineHeight: 1 }}>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 8, color: c.light, marginBottom: 4 }}>{meter.label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <span data-testid="six-meter-value" style={{ fontSize: 150, fontWeight: 700, textShadow: `0 8px 0 ${c.dark}, 0 0 40px ${c.light}aa` }}>{meter.meters}</span>
          <span style={{ fontSize: 54, fontWeight: 600, letterSpacing: 6 }}>METRES</span>
        </div>
        {meter.name && <div style={{ fontSize: 38, fontWeight: 500, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.95 }}>{meter.name}</div>}
      </div>
    </div>
  )
}
