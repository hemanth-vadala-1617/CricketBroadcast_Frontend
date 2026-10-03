import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui'
import { cn } from '../../lib/utils'
import type { PadAction } from '../../pages/scorer/buildRequest'

type Panel = null | 'wide' | 'noball' | 'bye' | 'legbye' | 'other'

interface Props {
  disabled: boolean
  freeHit: boolean
  /** keyboard shortcuts are ignored unless this is true (no modal open) */
  shortcuts: boolean
  onAction: (a: PadAction) => void
  onWicket: () => void
  onSwap?: () => void
  onUndo?: () => void
}

const pad = 'h-16 text-2xl'

function Chip({ active, children, onClick, label }: { active?: boolean; children: React.ReactNode; onClick: () => void; label?: string }) {
  return (
    <button type="button" aria-label={label} aria-pressed={active} onClick={onClick}
      className={cn('min-w-14 rounded-lg border px-3 py-3 text-base font-bold transition focus-visible:outline-2 focus-visible:outline-brand', active ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50')}>
      {children}
    </button>
  )
}

export default function ScoringPad({ disabled, freeHit, shortcuts, onAction, onWicket, onSwap, onUndo }: Props) {
  const [panel, setPanel] = useState<Panel>(null)
  const [nbBat, setNbBat] = useState<{ bat: number; boundary: boolean }>({ bat: 0, boundary: false })
  const [nbSecondary, setNbSecondary] = useState<'None' | 'Bye' | 'LegBye'>('None')
  const [nbByes, setNbByes] = useState(1)

  const send = (a: PadAction) => { setPanel(null); onAction(a) }

  // The key listener is attached once, so it must read the handlers through a ref. Capturing them in the effect left it
  // calling the scoring action from an old render (stale match version), so the shortcuts silently did nothing or failed.
  const latest = useRef({ onAction, onWicket, onSwap, onUndo })
  useEffect(() => { latest.current = { onAction, onWicket, onSwap, onUndo } })

  useEffect(() => {
    if (!shortcuts || disabled) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.repeat) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); latest.current.onUndo?.(); return }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (/^[0-6]$/.test(k)) {
        e.preventDefault(); const n = Number(k)
        setPanel(null); latest.current.onAction({ kind: 'runs', runs: n, boundary: n === 4 || n === 6 }); return
      }
      const map: Record<string, () => void> = {
        w: () => latest.current.onWicket(), s: () => latest.current.onSwap?.(),
        d: () => setPanel('wide'), n: () => setPanel('noball'), b: () => setPanel('bye'), l: () => setPanel('legbye'),
      }
      if (map[k]) { e.preventDefault(); map[k]!() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcuts, disabled])

  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p))

  return (
    <div className="flex flex-col gap-3" aria-label="Scoring pad">
      {freeHit && <p role="status" className="rounded-lg bg-red-600 px-3 py-2 text-center text-sm font-bold text-white">FREE HIT — only run out, handled ball or obstructing the field</p>}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
          <Button key={n} disabled={disabled} aria-label={n === 4 ? 'Four (boundary)' : n === 6 ? 'Six' : `${n} run${n === 1 ? '' : 's'}`}
            variant={n === 4 ? 'success' : n === 6 ? 'primary' : 'secondary'} className={pad}
            onClick={() => send({ kind: 'runs', runs: n, boundary: n === 4 || n === 6 })}>{n}</Button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        <Button disabled={disabled} variant="warning" className="h-14 text-lg" aria-label="Wide" aria-expanded={panel === 'wide'} onClick={() => toggle('wide')}>WD</Button>
        <Button disabled={disabled} variant="warning" className="h-14 text-lg" aria-label="No ball" aria-expanded={panel === 'noball'} onClick={() => toggle('noball')}>NB</Button>
        <Button disabled={disabled} variant="secondary" className="h-14 text-lg" aria-label="Bye" aria-expanded={panel === 'bye'} onClick={() => toggle('bye')}>BYE</Button>
        <Button disabled={disabled} variant="secondary" className="h-14 text-lg" aria-label="Leg bye" aria-expanded={panel === 'legbye'} onClick={() => toggle('legbye')}>LB</Button>
        <Button disabled={disabled} variant="secondary" className="h-14 text-lg" aria-label="Other run values" aria-expanded={panel === 'other'} onClick={() => toggle('other')}>…</Button>
      </div>
      <Button disabled={disabled} variant="danger" size="lg" className="h-16 text-xl" aria-label="Wicket" onClick={onWicket}>WICKET</Button>

      {panel === 'wide' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="mb-2 text-sm font-semibold text-amber-900">Wide — extra runs they ran</p>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((n) => <Chip key={n} label={`Wide plus ${n}`} onClick={() => send({ kind: 'wide', extraRuns: n })}>{n === 0 ? 'WD' : `WD+${n}`}</Chip>)}
            <Chip label="Wide plus 4 run" onClick={() => send({ kind: 'wide', extraRuns: 4 })}>WD+4 ran</Chip>
            <Chip label="Wide plus 4 boundary" onClick={() => send({ kind: 'wide', extraRuns: 4, boundary: true })}>WD+4 ⛶</Chip>
          </div>
        </div>
      )}

      {panel === 'noball' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="mb-2 text-sm font-semibold text-amber-900">No-ball — runs off the bat</p>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 5].map((n) => <Chip key={n} active={nbBat.bat === n && !nbBat.boundary} onClick={() => setNbBat({ bat: n, boundary: false })}>{n}</Chip>)}
            <Chip active={nbBat.bat === 4 && !nbBat.boundary} onClick={() => setNbBat({ bat: 4, boundary: false })}>4 ran</Chip>
            <Chip active={nbBat.bat === 4 && nbBat.boundary} onClick={() => setNbBat({ bat: 4, boundary: true })}>4 ⛶</Chip>
            <Chip active={nbBat.bat === 6} onClick={() => setNbBat({ bat: 6, boundary: true })}>6</Chip>
          </div>
          <p className="mb-2 mt-3 text-sm font-semibold text-amber-900">Plus byes / leg-byes (optional)</p>
          <div className="flex flex-wrap items-center gap-2">
            {(['None', 'Bye', 'LegBye'] as const).map((s) => <Chip key={s} active={nbSecondary === s} onClick={() => setNbSecondary(s)}>{s === 'None' ? 'None' : s === 'Bye' ? 'Byes' : 'Leg-byes'}</Chip>)}
            {nbSecondary !== 'None' && [1, 2, 3, 4].map((n) => <Chip key={n} active={nbByes === n} onClick={() => setNbByes(n)}>{n}</Chip>)}
          </div>
          <Button className="mt-3" variant="warning" onClick={() => send({
            kind: 'noball', bat: nbBat.bat, boundary: nbBat.boundary,
            ...(nbSecondary !== 'None' ? { secondary: nbSecondary, extraRuns: nbByes } : {}),
          })}>Score no-ball</Button>
        </div>
      )}

      {(panel === 'bye' || panel === 'legbye') && (
        <div className="rounded-lg border border-teal-300 bg-teal-50 p-3">
          <p className="mb-2 text-sm font-semibold text-teal-900">{panel === 'bye' ? 'Byes' : 'Leg-byes'} — runs</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((n) => <Chip key={n} label={`${n} ${panel}`} onClick={() => send({ kind: panel, runs: n })}>{n}</Chip>)}
            <Chip label="4 ran" onClick={() => send({ kind: panel, runs: 4 })}>4 ran</Chip>
            <Chip label="4 boundary" onClick={() => send({ kind: panel, runs: 4, boundary: true })}>4 ⛶</Chip>
          </div>
        </div>
      )}

      {panel === 'other' && (
        <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-700">Other run values off the bat</p>
          <div className="flex flex-wrap gap-2">
            <Chip label="Four runs ran, no boundary" onClick={() => send({ kind: 'runs', runs: 4 })}>4 ran (no boundary)</Chip>
            <Chip label="Five runs" onClick={() => send({ kind: 'runs', runs: 5 })}>5</Chip>
            <Chip label="Seven runs" onClick={() => send({ kind: 'runs', runs: 7 })}>7</Chip>
          </div>
        </div>
      )}
    </div>
  )
}
