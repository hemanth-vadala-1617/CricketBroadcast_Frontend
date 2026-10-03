import { useEffect, useState, type ReactNode } from 'react'
import { assetUrl, contrastText, initials } from '../../lib/utils'
import type { TeamLite } from '../../lib/types'

const EXIT_MS = 400

/** Keeps a graphic mounted long enough to play its exit animation. Respects reduced motion. */
export function Presence({ show, enter = 'up', children }: { show: boolean; enter?: 'up' | 'down' | 'pop'; children: ReactNode }) {
  const [mounted, setMounted] = useState(show)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (show) { setMounted(true); setLeaving(false); return }
    if (!mounted) return
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setMounted(false); return }
    setLeaving(true)
    const t = setTimeout(() => { setMounted(false); setLeaving(false) }, EXIT_MS)
    return () => clearTimeout(t)
  }, [show, mounted])

  if (!show && !mounted) return null
  const anim = enter === 'down' ? 'anim-slide-down' : enter === 'pop' ? 'anim-pop' : 'anim-slide-up'
  const dir = enter === 'down' ? '-40px' : '40px'
  return (
    <div
      data-presence={leaving ? 'leaving' : 'in'}
      className={leaving ? undefined : anim}
      style={leaving ? { position: 'absolute', inset: 0, opacity: 0, transform: `translateY(${dir})`, transition: `all ${EXIT_MS}ms ease-in` } : { position: 'absolute', inset: 0 }}
    >
      {children}
    </div>
  )
}

export function TeamLogo({ team, size }: { team: Pick<TeamLite, 'name' | 'shortName' | 'logoUrl' | 'primaryColor'>; size: number }) {
  const logo = assetUrl(team.logoUrl)
  const common = { width: size, height: size, flexShrink: 0, borderRadius: '50%' } as const
  if (logo) return <img src={logo} alt="" style={{ ...common, objectFit: 'contain', background: 'rgba(255,255,255,.08)' }} />
  const bg = team.primaryColor ?? '#64748b'
  return (
    <span className="font-display" style={{ ...common, display: 'grid', placeItems: 'center', background: bg, color: contrastText(bg), fontSize: size * 0.3, fontWeight: 700, border: '3px solid rgba(255,255,255,.85)', boxSizing: 'border-box' }}>
      {team.shortName.slice(0, 3)}
    </span>
  )
}

export function PlayerPhoto({ name, photoUrl, width, height }: { name: string; photoUrl: string | null; width: number; height: number }) {
  const url = assetUrl(photoUrl)
  if (url) return <img src={url} alt="" style={{ width, height, objectFit: 'contain', objectPosition: 'bottom left' }} />
  return (
    <span className="font-display" style={{ width: width * 0.7, height: width * 0.7, margin: `${height - width * 0.7}px 0 0 ${width * 0.1}px`, display: 'grid', placeItems: 'center', borderRadius: '50%', background: 'rgba(255,255,255,.2)', color: '#fff', fontSize: width * 0.26, fontWeight: 700 }}>
      {initials(name)}
    </span>
  )
}

export function BatIcon({ size = 36, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 19.5l9.2-9.2 2 2-9.2 9.2a1.4 1.4 0 01-2 0l-.1-.1a1.4 1.4 0 01.1-1.9z" fill={color} />
      <path d="M14.4 9.6l3.6-3.6a2 2 0 012.8 0 2 2 0 010 2.8l-3.6 3.6z" fill={color} opacity=".75" />
      <circle cx="19.5" cy="19.5" r="2" fill={color} />
    </svg>
  )
}
