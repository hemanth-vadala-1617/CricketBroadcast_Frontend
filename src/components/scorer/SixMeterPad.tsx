import { useState } from 'react'
import { Button, Card, Input } from '../ui'
import { cn } from '../../lib/utils'
import type { LastBall } from '../../lib/types'
import { tierFor } from '../overlay/sixMeter'

const QUICK = [70, 80, 90, 100, 105]
export const MAX_METERS = 200

/** Shown right after a six: tap how far it went and the "six meter" graphic goes on air (80+ / 90+ / 100 / 100+ have their own looks). */
export default function SixMeterPad({ lastBall, busy, onSet }: { lastBall: LastBall; busy: boolean; onSet: (meters: number | null) => void }) {
  const [text, setText] = useState('')
  const typed = Number(text)
  const valid = Number.isInteger(typed) && typed >= 1 && typed <= MAX_METERS
  const current = lastBall.sixDistance ?? null
  return (
    <Card className="p-4" data-testid="six-meter-pad">
      {(lastBall.sixStreak ?? 0) >= 2 && (
        <p data-testid="six-streak-note" className="mb-3 rounded-lg bg-orange-100 px-3 py-2 text-sm font-bold text-orange-900">
          {lastBall.sixStreak === 2 ? 'Back-to-back sixes' : `${lastBall.sixStreak} sixes in a row`}: the special graphic is on air.
        </p>
      )}
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Six meter</h3>
      <p className="mb-3 text-xs text-slate-500">
        {current ? <>On air: <strong>{current} m</strong> ({tierFor(current).label.toLowerCase()}).</> : 'How far did that six go? Tap a distance to show it on screen.'}
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {QUICK.map((m) => (
          <button key={m} type="button" disabled={busy} aria-pressed={current === m} onClick={() => onSet(m)}
            className={cn('min-w-14 rounded-lg border px-3 py-2 text-base font-bold disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand', current === m ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50')}>
            {m === 105 ? '100+' : m}
          </button>
        ))}
      </div>
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (valid) { onSet(typed); setText('') } }}>
        <Input aria-label="Exact distance in metres" type="number" inputMode="numeric" min={1} max={MAX_METERS} placeholder="Exact metres" className="w-36" value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" size="sm" disabled={busy || !valid}>Show</Button>
        {current && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onSet(null)}>Clear</Button>}
      </form>
    </Card>
  )
}
