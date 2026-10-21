import { useState } from 'react'
import { Avatar, Button, Field, Modal, Select } from '../ui'
import { cn } from '../../lib/utils'
import { canNonStrikerBeOut, DISMISSALS, fielderNeed, isDismissalAllowed, validateWicket, type PadAction } from '../../pages/scorer/buildRequest'
import type { DismissalType, ExtrasType, MatchState } from '../../lib/types'

type Wicket = Extract<PadAction, { kind: 'wicket' }>

export default function WicketModal({ state, onClose, onSubmit, title = 'Wicket', serverError = null, busy = false }: { state: MatchState; onClose: () => void; onSubmit: (a: Wicket) => void; title?: string; serverError?: string | null; busy?: boolean }) {
  const inn = state.innings!
  const [type, setType] = useState<DismissalType | null>(null)
  const [ballType, setBallType] = useState<Extract<ExtrasType, 'None' | 'Wide' | 'NoBall'>>('None')
  const [outId, setOutId] = useState<string>(inn.striker?.playerId ?? '')
  const [fielderId, setFielderId] = useState('')
  const [runs, setRuns] = useState(0)
  const [error, setError] = useState('')

  const striker = inn.striker, nonStriker = inn.nonStriker
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
      newBatterId: null, runs, ballType,   // who comes in is chosen afterwards in the side panel, when the scorer is ready
    }
    const problem = validateWicket(a, striker?.playerId ?? null, nonStriker?.playerId ?? null)
    if (problem) { setError(problem); return }
    onSubmit(a)
  }

  return (
    <Modal open onClose={onClose} title={title} size="lg" footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="danger" loading={busy} disabled={type === null} onClick={submit}>Confirm wicket</Button>
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

        {/* This block is always there, even before a dismissal is picked, and its fields sit in ONE row on a wide screen. Picking a
            dismissal used to make the dialog taller and moved "Confirm wicket" down, so a tap on its old position hit nothing. */}
        <div className="grid gap-4 sm:min-h-[9rem] sm:grid-cols-4">
          {type && (<>
            {/* the batter who is out: tap a card (same look as the Select bowler / Select batter list) instead of using a drop-down */}
            <div role="radiogroup" aria-label="Who is out" className="flex flex-col gap-2 sm:col-span-2">
              <p className="text-sm font-medium text-slate-700">Who is out</p>
              <div className="grid gap-2">
                {([[striker, 'striker'], [nonStriker && canNonStrikerBeOut(type) ? nonStriker : null, 'non-striker']] as const).map(([b, role]) => b && (
                  <button key={b.playerId} type="button" role="radio" aria-checked={outId === b.playerId} onClick={() => setOutId(b.playerId)}
                    className={cn('flex items-center gap-3 rounded-lg border p-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand',
                      outId === b.playerId ? 'border-red-600 bg-red-50 text-slate-900' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50')}>
                    <Avatar name={b.name} src={b.photoUrl} size={32} />
                    <span className="min-w-0 flex-1 truncate">{b.name}</span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{role}</span>
                  </button>
                ))}
              </div>
            </div>
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
          </>)}
        </div>
        {(error || serverError) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">{error || serverError}</p>}
      </div>
    </Modal>
  )
}

