import { useState } from 'react'
import { Timer } from 'lucide-react'
import type { MatchBreak } from '../../lib/types'
import { Button, Card, Input } from '../ui'
import { useBreakSeconds } from '../overlay/BreakCard'
import { breakOptions, clockFor } from '../overlay/breaks'

/**
 * Stoppages: strategic timeout, drinks, injury, rain, bad light, wet outfield (and lunch, tea, stumps in a Test).
 * One tap starts the break on the overlay with its own card and clock; Resume play ends it.
 */
export default function BreaksCard({ isTest, current, canStart, busy, onStart, onResume }: {
  isTest: boolean; current: MatchBreak | null | undefined; canStart: boolean; busy: boolean
  onStart: (kind: string, minutes: number | null) => void; onResume: () => void
}) {
  const [minutes, setMinutes] = useState('')
  const seconds = useBreakSeconds(current)
  const chosen = minutes.trim() === '' ? null : Number(minutes)
  const valid = chosen === null || (Number.isInteger(chosen) && chosen >= 0 && chosen <= 600)

  if (current) {
    const clock = clockFor(current, seconds)
    return (
      <Card className="border-amber-300 bg-amber-50 p-4" data-testid="breaks-card">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-900"><Timer className="size-4" aria-hidden />On a break</h3>
        <p role="status" className="mb-3 text-sm font-semibold text-amber-900">{current.label} · {clock.text} {clock.label.toLowerCase()}</p>
        <Button variant="success" className="w-full" disabled={busy} onClick={onResume}>Resume play</Button>
      </Card>
    )
  }
  if (!canStart) return null
  return (
    <Card className="p-4" data-testid="breaks-card">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Breaks</h3>
      <p className="mb-3 text-xs text-slate-500">Starts the break card with a clock on the overlay and locks scoring until you resume.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {breakOptions(isTest).map((o) => (
          <Button key={o.kind} size="sm" variant="secondary" disabled={busy || !valid} onClick={() => onStart(o.kind, chosen)}
            title={o.minutes > 0 ? `Usual length ${o.minutes} min` : 'No fixed length'}>
            {o.label}{o.minutes > 0 && <span className="ml-1 text-xs font-normal text-slate-500">{o.minutes}m</span>}
          </Button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        Length (minutes, optional)
        <Input aria-label="Break length in minutes" type="number" inputMode="numeric" min={0} max={600} placeholder="usual" className="w-24" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
      </label>
      {!valid && <p role="alert" className="mt-2 text-xs text-red-600">Enter 0 to 600 minutes, or leave it empty for the usual length.</p>}
    </Card>
  )
}
