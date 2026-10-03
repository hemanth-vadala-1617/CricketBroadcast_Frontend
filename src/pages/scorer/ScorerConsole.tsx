import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Keyboard, Radio } from 'lucide-react'
import { useLiveMatch } from '../../hooks/useLiveMatch'
import type { LiveStatus } from '../../lib/liveMatch'
import { Button, Card, ConfirmDialog, Field, Input, Modal, Spinner, StatusBadge } from '../../components/ui'
import { cn } from '../../lib/utils'
import ScoreStrip from '../../components/scorer/ScoreStrip'
import ScoringPad from '../../components/scorer/ScoringPad'
import WicketModal from '../../components/scorer/WicketModal'
import PreInnings from '../../components/scorer/PreInnings'
import { CheatSheet, CompleteMatchModal, OversLostModal, PenaltyModal, PlayerPicker, RetireModal, UndoModal } from '../../components/scorer/Dialogs'
import { useScorer } from './useScorer'
import { LineupToggle } from '../../components/scorer/LineupAirToggle'
import type { PadAction } from './buildRequest'

type Dlg = null | 'wicket' | 'editWicket' | 'edit' | 'undo' | 'retire' | 'penalty' | 'endInnings' | 'declare' | 'complete'
  | 'oversLost' | 'cheat' | 'changeBowler' | 'cancelInnings' | 'session'

const dot: Record<LiveStatus, { color: string; label: string }> = {
  live: { color: 'bg-emerald-500', label: 'Live' },
  connecting: { color: 'bg-amber-400', label: 'Connecting…' },
  reconnecting: { color: 'bg-amber-400', label: 'Reconnecting…' },
  offline: { color: 'bg-red-500', label: 'Offline' },
  notfound: { color: 'bg-red-500', label: 'Match not found' },
  idle: { color: 'bg-slate-400', label: 'Idle' },
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </Card>
  )
}

export default function ScorerConsole() {
  const { matchId = '' } = useParams()
  const { state, status, apply } = useLiveMatch(matchId)
  const sc = useScorer(matchId, apply)
  const [dlg, setDlg] = useState<Dlg>(null)
  const [preview, setPreview] = useState(true)
  const [editReason, setEditReason] = useState('')

  const close = useCallback(() => setDlg(null), [])
  const openWicket = useCallback(() => setDlg('wicket'), [])
  const openUndo = useCallback(() => setDlg('undo'), [])
  const swap = useCallback(() => { void sc.swapStrike() }, [sc])

  if (!state) {
    return <div className="grid min-h-full place-items-center bg-slate-100"><Spinner label={status === 'notfound' ? 'Match not found. Open it from the Matches list.' : status === 'offline' ? 'Cannot reach the server. Check the API is running and the address in the URL. Retrying…' : 'Loading match…'} /></div>
  }

  const a = state.actions
  const inn = state.innings
  const inProgress = inn?.status === 'InProgress'
  const paused = state.status === 'RainDelay' || state.status === 'Paused'
  const blockerBatter = inProgress && a.awaitingNewBatter && dlg === null
  const blockerBowler = inProgress && !a.awaitingNewBatter && a.awaitingNewBowler && dlg === null
  const padDisabled = sc.busy || !a.canScoreBall
  const finished = state.status === 'Completed' || state.status === 'Abandoned'

  const doScore = async (action: PadAction) => { await sc.score(action) }
  const submitWicket = async (action: Extract<PadAction, { kind: 'wicket' }>) => { if ((await sc.score(action)) === 'ok') close() }
  const submitEdit = async (action: PadAction) => { if ((await sc.editLast(action, editReason.trim())) === 'ok') close() }
  const submitEditWicket = async (action: Extract<PadAction, { kind: 'wicket' }>) => { if ((await sc.editLast(action, editReason.trim())) === 'ok') close() }
  const run = (p: Promise<unknown>, after: () => void = close) => { void p.then(after) }

  return (
    <div className="min-h-full bg-slate-100">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 shadow-sm">
        <Link to={`/admin/matches/${matchId}`} aria-label="Back to match" className="rounded p-1 text-slate-500 hover:bg-slate-100"><ArrowLeft className="size-5" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-slate-900">{state.title}</h1>
          <p className="truncate text-xs text-slate-500">{state.tournamentName} · {state.venueName}</p>
        </div>
        <StatusBadge status={state.status} />
        {/* Only shown when the connection is NOT fine: a second "Live" next to the match's LIVE badge was confusing. */}
        {status !== 'live' && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600" role="status" aria-label={`Connection: ${dot[status].label}`}>
            <span className={cn('size-2.5 rounded-full', dot[status].color)} />{dot[status].label}
          </span>
        )}
        <Link to={`/producer/${matchId}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Radio className="size-4" />Producer</Link>
        <Button size="sm" variant="secondary" aria-pressed={preview} onClick={() => setPreview((p) => !p)}>{preview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}Preview</Button>
        <Button size="sm" variant="secondary" aria-label="Keyboard shortcuts" onClick={() => setDlg('cheat')}><Keyboard className="size-4" /></Button>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {finished && (
            <div role="status" className="rounded-xl bg-purple-700 p-4 text-center text-lg font-bold text-white">{state.resultText ?? state.status}</div>
          )}
          {paused && (
            <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-amber-500 p-4 font-bold text-white">
              <span>{state.status === 'RainDelay' ? 'Rain delay' : 'Match paused'}. Scoring is locked.</span>
              <Button variant="secondary" loading={sc.busy} onClick={() => void sc.resume()}>Resume play</Button>
            </div>
          )}

          {/* The TV scoreboard exactly as OBS will show it; it updates on every ball you score. */}
          {preview && (
            <Card className="overflow-hidden">
              <div className="aspect-video w-full bg-slate-900">
                <iframe title="TV scoreboard preview" src={`/overlay/${matchId}?bg=1`} className="size-full border-0" />
              </div>
            </Card>
          )}

          {inn && <ScoreStrip state={state} />}

          {inProgress ? (
            <Card className="p-4">
              <ScoringPad disabled={padDisabled} freeHit={inn.freeHit} shortcuts={dlg === null && !blockerBatter && !blockerBowler}
                onAction={(x) => void doScore(x)} onWicket={openWicket} onSwap={swap} onUndo={openUndo} />
              {!a.canScoreBall && !paused && (a.awaitingNewBatter || a.awaitingNewBowler) && <p role="status" className="mt-3 text-sm font-semibold text-amber-700">Choose the {a.awaitingNewBatter ? 'incoming batter' : 'next bowler'} to continue.</p>}
            </Card>
          ) : !finished && (
            <PreInnings state={state} busy={sc.busy} matchId={matchId}
              onStartMatch={() => void sc.startMatch()} onStart={(i) => void sc.startInnings(i)} onComplete={() => setDlg('complete')} />
          )}
        </div>

        <aside className="flex flex-col gap-4" aria-label="Scorer actions">
          <Group title="Correct">
            <Button variant="warning" disabled={sc.busy || !a.canUndo} onClick={openUndo}>Undo ball</Button>
            <Button variant="secondary" disabled={sc.busy || !a.canUndo || !state.lastBall} onClick={() => { setEditReason('Wrong runs'); setDlg('edit') }}>Edit last ball</Button>
            <Button variant="secondary" disabled={sc.busy || !inProgress || a.awaitingNewBatter} onClick={swap}>Swap strike</Button>
            <Button variant="secondary" disabled={sc.busy || !inProgress || a.awaitingNewBatter} onClick={() => setDlg('retire')}>Retire batter</Button>
            <Button variant="secondary" disabled={sc.busy || !inProgress} onClick={() => setDlg('penalty')}>Penalty runs</Button>
            <Button variant="secondary" disabled={sc.busy || !inProgress || !inn?.bowler || a.awaitingNewBowler} onClick={() => setDlg('changeBowler')}>Change bowler</Button>
          </Group>

          <Group title="Innings & match">
            <Button variant="secondary" disabled={sc.busy || !inProgress} onClick={() => setDlg('endInnings')}>End innings</Button>
            {a.canDeclare && <Button variant="secondary" disabled={sc.busy} onClick={() => setDlg('declare')}>Declare</Button>}
            <Button variant="secondary" disabled={sc.busy || !inProgress || state.lastBall !== null} onClick={() => setDlg('cancelInnings')}>Cancel innings start</Button>
            {(state.status === 'Live' || state.status === 'InningsBreak') && (
              <>
                <Button variant="secondary" disabled={sc.busy} onClick={() => void sc.pause(true)}>Rain delay</Button>
                <Button variant="secondary" disabled={sc.busy} onClick={() => void sc.pause(false)}>Pause</Button>
              </>
            )}
            <Button variant="danger" disabled={sc.busy || !a.canComplete} onClick={() => setDlg('complete')}>Complete match</Button>
          </Group>

          {state.isTest && state.testClock && (
            <Group title={`Test clock · Day ${state.testClock.day} : Session ${state.testClock.session}`}>
              <p className="w-full text-sm text-slate-600">{state.testClock.oversLeftToday} overs left today{state.testClock.oversLostToday > 0 ? ` (${state.testClock.oversLostToday} lost)` : ''}</p>
              <Button variant="secondary" disabled={sc.busy} onClick={() => setDlg('session')}>Next session</Button>
              <Button variant="secondary" disabled={sc.busy} onClick={() => setDlg('oversLost')}>Overs lost today</Button>
            </Group>
          )}

          {state.scorecard.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Innings</h3>
              <ul className="space-y-1 text-sm">
                {state.scorecard.map((c) => (
                  <li key={c.inningsNumber} className="flex justify-between"><span>{c.battingTeam.shortName} · inns {c.inningsNumber}</span><span className="font-mono font-semibold">{c.runs}/{c.wickets} ({c.overs})</span></li>
                ))}
              </ul>
            </Card>
          )}

          {/* put a team's playing XI on air without leaving the scoring screen */}
          <LineupToggle state={state} onState={apply} />
        </aside>
      </div>

      {/* ---- dialogs ---- */}
      {dlg === 'wicket' && inn && <WicketModal state={state} onClose={close} onSubmit={(x) => void submitWicket(x)} />}
      {dlg === 'edit' && inn && (
        <Modal open onClose={close} title="Edit last ball" size="lg" footer={<Button variant="secondary" onClick={close}>Cancel</Button>}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">Press the correct result. The last ball is replaced (the old one is kept in the audit log).</p>
            <Field label="Reason" error={editReason.trim().length < 3 ? 'Give a reason (min 3 characters).' : undefined}>
              {(id) => <Input id={id} value={editReason} onChange={(e) => setEditReason(e.target.value)} />}
            </Field>
            <ScoringPad disabled={sc.busy || editReason.trim().length < 3} freeHit={false} shortcuts={false}
              onAction={(x) => void submitEdit(x)} onWicket={() => setDlg('editWicket')} />
          </div>
        </Modal>
      )}
      {dlg === 'editWicket' && inn && <WicketModal state={state} title="Replace last ball with a wicket" onClose={() => setDlg('edit')} onSubmit={(x) => void submitEditWicket(x)} />}
      {dlg === 'undo' && <UndoModal lastBall={state.lastBall} onClose={close} onConfirm={(r) => run(sc.undo(r))} />}
      {dlg === 'retire' && inn && <RetireModal state={state} onClose={close} onConfirm={(p, n, r) => run(sc.retire(p, n, r))} />}
      {dlg === 'penalty' && <PenaltyModal onClose={close} onConfirm={(runs, r) => run(sc.penalty(runs, r))} />}
      {dlg === 'complete' && <CompleteMatchModal state={state} onClose={close} onConfirm={(c) => run(sc.complete(c))} />}
      {dlg === 'oversLost' && state.testClock && (
        <OversLostModal current={state.testClock.oversLostToday} max={90} onClose={close} onConfirm={(n) => run(sc.oversLost(n))} />
      )}
      {dlg === 'cheat' && <CheatSheet onClose={close} />}
      {dlg === 'changeBowler' && (
        <PlayerPicker title="Change bowler mid-over" hint="Use only if the bowler cannot finish the over (injury). The new bowler finishes the over." players={a.eligibleBowlers}
          busy={sc.busy} onClose={close} onPick={(p) => run(sc.newBowler(p.id, true))} />
      )}

      <ConfirmDialog open={dlg === 'endInnings'} title="End the innings?" confirmLabel="End innings" danger loading={sc.busy}
        message="This closes the current innings now (all out, time up, forfeit). It cannot be undone except by undoing the last ball."
        onClose={close} onConfirm={() => run(sc.endInnings(false))} />
      <ConfirmDialog open={dlg === 'declare'} title="Declare the innings?" confirmLabel="Declare" danger loading={sc.busy}
        message={`${inn?.battingTeam.name ?? 'The batting side'} declare at ${inn?.runs}/${inn?.wickets}.`}
        onClose={close} onConfirm={() => run(sc.endInnings(true))} />
      <ConfirmDialog open={dlg === 'cancelInnings'} title="Cancel this innings start?" confirmLabel="Cancel innings start" danger loading={sc.busy}
        message="No ball has been scored. The innings is removed so you can start it again with different openers."
        onClose={close} onConfirm={() => run(sc.cancelInnings())} />
      <ConfirmDialog open={dlg === 'session'} title="Move to the next session?" confirmLabel="Next session" loading={sc.busy}
        message={state.testClock ? `Currently Day ${state.testClock.day}, Session ${state.testClock.session}. After the last session the next day starts and lost overs reset.` : ''}
        onClose={close} onConfirm={() => run(sc.advanceSession())} />

      {/* ---- blocking pickers driven by the server's state ---- */}
      {blockerBatter && (
        <PlayerPicker blocking title="Incoming batter" hint="A wicket fell. Who comes in?" players={a.availableBatters} busy={sc.busy}
          onPick={(p) => void sc.newBatter(p.id)}
          footer={a.availableBatters.length === 0 ? <Button variant="danger" onClick={() => setDlg('endInnings')}>End innings</Button> : undefined} />
      )}
      {blockerBowler && (
        <PlayerPicker blocking title="Next bowler" hint="The over is complete. Choose who bowls next. The last bowler and anyone who has used their quota are not listed."
          players={a.eligibleBowlers} busy={sc.busy} onPick={(p) => void sc.newBowler(p.id)} />
      )}
    </div>
  )
}

