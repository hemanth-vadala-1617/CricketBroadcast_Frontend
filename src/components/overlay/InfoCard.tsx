import type { ReactNode } from 'react'

/** Centre card for states with no live play: match starts soon, innings break, suspended, result. */
export function InfoCard({ title, lines, accent, children }: { title: string; lines?: string[]; accent: string; children?: ReactNode }) {
  return (
    <div data-testid="info-card" className="anim-pop" style={{ position: 'absolute', left: 460, top: 400, width: 1000, borderRadius: 24, background: 'rgba(8,12,20,.9)', border: `4px solid ${accent}`, padding: '36px 48px', textAlign: 'center', color: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
      <div className="font-display" style={{ fontSize: 68, fontWeight: 700, letterSpacing: 4, color: accent, textTransform: 'uppercase' }}>{title}</div>
      {lines?.filter(Boolean).map((l, i) => (
        <div key={i} className="font-display" style={{ fontSize: 38, marginTop: 12, fontWeight: 500, lineHeight: 1.2 }}>{l}</div>
      ))}
      {children}
    </div>
  )
}
