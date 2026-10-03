import { useState } from 'react'
import { Button, Field, Modal, Select } from '../ui'
import { cn } from '../../lib/utils'
import { canNonStrikerBeOut, DISMISSALS, fielderNeed, isDismissalAllowed, validateWicket, type PadAction } from '../../pages/scorer/buildRequest'
import type { DismissalType, ExtrasType, MatchState } from '../../lib/types'

type Wicket = Extract<PadAction, { kind: 'wicket' }>

export default function WicketModal({ state, onClose, onSubmit, title = 'Wicket' }: { state: MatchState; onClose: () => void; onSubmit: (a: Wicket) => void; title?: string }) {
  const inn = state.innings!
  const [type, setType] = useState<DismissalType | null>(null)
  const [ballType, setBallType] = useState<Extract<ExtrasType, 'None' | 'Wide' | 'NoBall'>>('None')
  const [outId, setOutId] = useState<string>(inn.striker?.playerId ?? '')
  const [fielderId, setFielderId] = useState('')
  const [runs, setRuns] = useState(0)
  const [newBatter, setNewBatter] = useState('')
  const [error, setError] = useState('')

  const striker = inn.striker, nonStriker = inn.nonStriker
  const batters = state.actions.availableBatters
  const fielders = state.actions.fieldingXI
  const need = type ? fielderNeed(type) : 'none'

  function pick(t: DismissalType) {
    setType(t); setError('')
    if (!canNonStrikerBeOut(t) && striker) setOutId(striker.playerId)
  }

  function submit() {
    if (!type) return
    const a: Wicket = {
      kind: 'wicket', dismissal: type, dismissedPlayerId: outId || null, fielderId: fielderId || null,
      newBatterId: newBatter || null, runs, ballType,
    }
    const problem = validateWicket(a, striker?.playerId ?? null, nonStriker?.playerId ?? null)
    if (problem) { setError(problem); return }
    onSubmit(a)
  }

  return (
    <Modal open onClose={onClose} title={title} size="lg" footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="danger" disabled={type === null} onClick={submit}>Confirm wicket</Button>
    </>}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ball type</p>
          <div className="flex gap-2">
            {(['None', 'Wide', 'NoBall'] as const).map((b) => (
              <button key={b} type="button" aria-pressed={ballType === b} onClick={() => { setBallType(b); if (type && !isDismissalAllowed(type, inn.freeHit, b)) setType(null) }}
                className={cn('rounded-lg border px-3 py-2 text-sm font-semibold', ballType === b ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white')}>
                {b === 'None' ? 'Legal ball' : b === 'Wide' ? 'Wide' : 'No-ball'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">How out</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DISMISSALS.map((d) => {
              const ok = isDismissalAllowed(d.type, inn.freeHit, ballType)
              return (
                <button key={d.type} type="button" disabled={!ok} aria-pressed={type === d.type} onClick={() => pick(d.type)}
                  title={ok ? undefined : inn.freeHit ? 'Not allowed on a free hit' : 'Not allowed on this ball type'}
                  className={cn('h-14 rounded-lg border text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-40', type === d.type ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 bg-white hover:bg-slate-50')}>
                  {d.label}
                </button>
              )
            })}
          </div>
        </div>

        {type && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Who is out">
              {(id) => (
                <Select id={id} value={outId} onChange={(e) => setOutId(e.target.value)}>
                  {striker && <option value={striker.playerId}>{striker.name} (striker)</option>}
                  {nonStriker && canNonStrikerBeOut(type) && <option value={nonStriker.playerId}>{nonStriker.name} (non-striker)</option>}
                </Select>
              )}
            </Field>
            {need !== 'none' && (
              <Field label={type === 'Stumped' ? 'Wicket-keeper' : type === 'Caught' ? 'Caught by' : 'Fielder (optional)'} hint={type === 'Caught' && inn.bowler ? 'Caught & bowled: pick the bowler.' : undefined}>
                {(id) => (
                  <Select id={id} value={fielderId} onChange={(e) => setFielderId(e.target.value)}>
                    <option value="">{need === 'required' ? 'Select…' : 'Not recorded'}</option>
                    {fielders.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isWicketKeeper ? ' (wk)' : ''}</option>)}
                  </Select>
                )}
              </Field>
            )}
            {(type === 'RunOut' || type === 'ObstructingField' || type === 'HandledBall') && (
              <Field label="Runs completed on this ball" hint="Counted to the batter; the batters cross if the number is odd.">
                {(id) => <Select id={id} value={runs} onChange={(e) => setRuns(Number(e.target.value))}>{[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</Select>}
              </Field>
            )}
            <Field label="Incoming batter" hint="Choose later and the scorer is asked right after.">
              {(id) => (
                <Select id={id} value={newBatter} onChange={(e) => setNewBatter(e.target.value)}>
                  <option value="">Choose later</option>
                  {batters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              )}
            </Field>
          </div>
        )}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
      </div>
    </Modal>
  )
}

