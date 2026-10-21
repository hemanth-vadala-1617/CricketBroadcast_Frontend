import { Zap } from 'lucide-react'
import type { PowerSurge } from '../../lib/types'
import { Button, Card } from '../ui'

/** The Power Surge button in the side panel: one tap puts the Power Surge announcement and its "N overs left" tag on air. */
export default function PowerSurgeCard({ surge, busy, onStart, onCancel }: { surge: PowerSurge; busy: boolean; onStart: () => void; onCancel: () => void }) {
  const overs = `${surge.overs} ${surge.overs === 1 ? 'over' : 'overs'}`
  return (
    <Card className="border-violet-300 bg-violet-50 p-4" data-testid="power-surge-card">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-violet-900"><Zap className="size-4" aria-hidden />Power Surge</h3>

      {surge.active && (
        <p role="status" className="mb-3 rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white">
          On air: {surge.oversLeft} {surge.oversLeft === 1 ? 'over' : 'overs'} left
        </p>
      )}
      {surge.pending && (
        <p role="status" className="mb-3 rounded-lg bg-violet-100 px-3 py-2 text-sm font-semibold text-violet-900">
          Starts with over {surge.startOver}, when the current over ends.
        </p>
      )}
      {surge.used && !surge.active && !surge.pending && <p className="mb-3 text-sm text-slate-600">Used this innings (from over {surge.startOver}).</p>}

      {surge.canStart && (
        <>
          <Button variant="primary" className="w-full bg-violet-600 hover:bg-violet-700" disabled={busy} onClick={onStart}>
            <Zap className="size-4" aria-hidden />Start Power Surge · {overs}
          </Button>
          <p className="mt-2 text-xs text-violet-900/80">
            {(surge.nextStartOver ?? 0) > 0 ? `Begins with over ${surge.nextStartOver}. ` : ''}The animation plays as it begins and the scorebug shows the overs left.
          </p>
        </>
      )}
      {!surge.canStart && !surge.used && (
        <p className="text-sm text-slate-600">Not available now: it can start from over {surge.earliestOver} to over {surge.latestOver}.</p>
      )}
      {surge.canCancel && <Button variant="ghost" size="sm" className="mt-2" disabled={busy} onClick={onCancel}>Cancel Power Surge</Button>}
    </Card>
  )
}
