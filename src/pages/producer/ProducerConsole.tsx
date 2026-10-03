import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Eye, EyeOff, Radio } from 'lucide-react'
import { useLiveMatch } from '../../hooks/useLiveMatch'
import { api, errorMessage } from '../../lib/api'
import { overlayUrl } from '../../lib/overlayUrl'
import { toast } from '../../store/useToast'
import type { GraphicKey, MatchState } from '../../lib/types'
import { Badge, Button, Card, Field, ImageUpload, Input, Spinner } from '../../components/ui'
import { normalise, type Prob, type ProbKey } from './winProb'

/** Time one team's XI needs to roll out card by card, plus a few seconds to read it (matches the overlay animation). */
const lineupHoldMs = (players: number) => 450 + players * 170 + 4500

const GRAPHICS: { key: GraphicKey; label: string; hint: string }[] = [
  { key: 'Scorebug', label: 'Scorebug', hint: 'Top bar with score, last ball, strips' },
  { key: 'BatterCards', label: 'Batter cards', hint: 'The two batters at the crease' },
  { key: 'BowlerCard', label: 'Bowler card', hint: 'Current bowler figures' },
  { key: 'Timeline', label: 'Timeline', hint: 'Last two overs, ball by ball' },
  { key: 'WinProbability', label: 'Win probability', hint: 'Shown inside the scorebug strip' },
  { key: 'FullScorecard', label: 'Full scorecard', hint: 'Full-screen scorecard panel' },
]

function PreviewFrame({ matchId }: { matchId: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const update = () => setScale(el.clientWidth / 1920)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={box} className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe title="Overlay preview" src={`/overlay/${matchId}?bg=1`} width={1920} height={1080} className="absolute left-0 top-0 border-0" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }} />
    </div>
  )
}

export default function ProducerConsole() {
  const { matchId } = useParams()
  const { state, status, apply } = useLiveMatch(matchId)
  const [busy, setBusy] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [prob, setProb] = useState<Prob>({ home: 0, draw: 0, away: 0 })
  const synced = useRef(false)
  const sequence = useRef(0)

  // leaving the page cancels a running home-then-away sequence
  useEffect(() => () => { sequence.current++ }, [])

  // Fill the editors once from the live state (a producer who reloads sees what is on air).
  useEffect(() => {
    if (!state || synced.current) return
    synced.current = true
    const p = state.graphics.Banner.payload
    setText(typeof p?.text === 'string' ? p.text : '')
    setImage(typeof p?.imageUrl === 'string' ? p.imageUrl : null)
    setProb({ ...state.winProbability })
  }, [state])

  if (!matchId) return null
  if (!state) return <div className="p-8"><Spinner label="Connecting to the match…" /></div>

  async function run<T extends MatchState>(id: string, call: () => Promise<T>, ok: string) {
    setBusy(id)
    try { apply(await call()); toast.success(ok) } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) }
  }
  const setGraphic = (key: GraphicKey, isVisible: boolean, payload?: Record<string, unknown>) =>
    run(key + isVisible, () => api.put<MatchState>(`/api/graphics/match/${matchId}/${key}`, { isVisible, payload }), `${key} ${isVisible ? 'on air' : 'hidden'}`)

  const hasDraw = state.isTest
  const sum = prob.home + prob.draw + prob.away
  const home = state.homeTeam.shortName
  const away = state.awayTeam.shortName
  const lineups = [state.lineups?.home, state.lineups?.away].filter((l): l is NonNullable<typeof l> => !!l)
  const lineupOn = state.graphics.TeamLineup?.isVisible ? (state.graphics.TeamLineup.payload?.teamId as string | undefined) : undefined
  const showLineup = (teamId: string) => setGraphic('TeamLineup', true, { teamId })
  const hideLineup = () => { sequence.current++; return setGraphic('TeamLineup', false) }
  /** Home XI, wait for it to finish rolling out, then the away XI. Hiding or pressing again cancels it. */
  async function rollBoth() {
    const token = ++sequence.current
    for (const l of lineups) {
      if (sequence.current !== token || l.players.length === 0) continue
      await showLineup(l.team.id)
      await new Promise((r) => setTimeout(r, lineupHoldMs(l.players.length)))
    }
  }
  const sendProb = (p: Prob) => run('prob', () => api.put<MatchState>(`/api/matches/${matchId}/win-probability`, p), p.home + p.draw + p.away === 0 ? 'Win probability hidden' : 'Win probability updated')

  const slider = (k: ProbKey, label: string, disabled = false) => (
    <Field label={`${label} — ${prob[k]}%`} key={k}>
      {(id) => (
        <input
          id={id} type="range" min={0} max={100} value={prob[k]} disabled={disabled}
          onChange={(e) => setProb({ ...prob, [k]: Number(e.target.value) })}
          onPointerUp={() => setProb((p) => normalise(p, k, hasDraw))}
          onKeyUp={() => setProb((p) => normalise(p, k, hasDraw))}
          onBlur={() => setProb((p) => normalise(p, k, hasDraw))}
          className="w-full accent-emerald-600"
        />
      )}
    </Field>
  )

  return (
    <div className="min-h-full bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to={`/admin/matches/${matchId}`} className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><ArrowLeft className="size-4" aria-hidden />Match control</Link>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Radio className="size-6 text-brand" aria-hidden />Producer console</h1>
            <p className="text-sm text-slate-500">{state.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={status === 'live' ? 'green' : 'amber'}>{status === 'live' ? 'Connected' : `Socket ${status}`}</Badge>
            <Button variant="secondary" onClick={() => { void navigator.clipboard.writeText(overlayUrl(matchId)).then(() => toast.success('Overlay URL copied. Paste it into an OBS Browser Source (1920x1080).'), () => toast.error('Could not copy; select the URL manually.')) }}>
              <Copy className="size-4" aria-hidden />Copy overlay URL
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-4">
            <Card className="p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">Player introduction (playing XI)<Badge tone={lineupOn ? 'green' : 'gray'}>{lineupOn ? 'ON AIR' : 'off'}</Badge></h2>
              <p className="mb-3 text-xs text-slate-500">The eleven player cards roll out one by one over the picture, as before an IPL match. Set the squads in Match setup first.</p>
              <ul className="flex flex-col gap-2">
                {lineups.map((l) => (
                  <li key={l.team.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">{l.team.name}<Badge tone={lineupOn === l.team.id ? 'green' : 'gray'}>{lineupOn === l.team.id ? 'ON AIR' : `${l.players.length} players`}</Badge></div>
                      {l.players.length === 0 && <p className="text-xs font-medium text-amber-700">No playing XI yet. Pick it in Match setup.</p>}
                    </div>
                    <Button size="lg" variant="success" disabled={l.players.length === 0 || lineupOn === l.team.id} loading={busy === 'TeamLineuptrue'} onClick={() => { sequence.current++; void showLineup(l.team.id) }} aria-label={`Show ${l.team.name} playing XI`}>
                      <Eye className="size-4" aria-hidden />SHOW XI
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="primary" disabled={lineups.every((l) => l.players.length === 0)} onClick={() => void rollBoth()}>Roll out both teams</Button>
                <Button variant="danger" disabled={!lineupOn} loading={busy === 'TeamLineupfalse'} onClick={() => void hideLineup()}><EyeOff className="size-4" aria-hidden />HIDE</Button>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Graphics</h2>
              <ul className="flex flex-col gap-2">
                {GRAPHICS.map((g) => {
                  const on = state.graphics[g.key].isVisible
                  return (
                    <li key={g.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-semibold text-slate-900">{g.label}<Badge tone={on ? 'green' : 'gray'}>{on ? 'ON AIR' : 'off'}</Badge></div>
                        <p className="truncate text-xs text-slate-500">{g.hint}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="lg" variant="success" disabled={on} loading={busy === g.key + true} onClick={() => void setGraphic(g.key, true)} aria-label={`Show ${g.label}`}><Eye className="size-4" aria-hidden />SHOW</Button>
                        <Button size="lg" variant="danger" disabled={!on} loading={busy === g.key + false} onClick={() => void setGraphic(g.key, false)} aria-label={`Hide ${g.label}`}><EyeOff className="size-4" aria-hidden />HIDE</Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">Banner<Badge tone={state.graphics.Banner.isVisible ? 'green' : 'gray'}>{state.graphics.Banner.isVisible ? 'ON AIR' : 'off'}</Badge></h2>
              <div className="flex flex-col gap-3">
                <Field label="Text" hint="e.g. Happy Independence Day. Leave empty to show the image alone.">{(id) => <Input id={id} value={text} maxLength={80} onChange={(e) => setText(e.target.value)} />}</Field>
                <ImageUpload label="Image (optional)" preset="banner" value={image} onChange={setImage} />
                <div className="flex gap-2">
                  <Button variant="success" disabled={!text.trim() && !image} loading={busy === 'Bannertrue'} onClick={() => void setGraphic('Banner', true, { text: text.trim(), imageUrl: image })}>Show banner</Button>
                  <Button variant="danger" disabled={!state.graphics.Banner.isVisible} loading={busy === 'Bannerfalse'} onClick={() => void setGraphic('Banner', false)}>Hide banner</Button>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Win probability</h2>
              <div className="flex flex-col gap-3">
                {slider('home', home)}
                {slider('draw', 'Draw', !hasDraw)}
                {slider('away', away)}
                <p className={sum === 100 || sum === 0 ? 'text-xs text-slate-500' : 'text-xs font-semibold text-red-600'}>{`Total ${sum}%${sum !== 100 && sum !== 0 ? ' — release a slider to rebalance to 100' : ''}`}</p>
                <div className="flex gap-2">
                  <Button disabled={sum !== 100} loading={busy === 'prob'} onClick={() => void sendProb(prob)}>Apply to air</Button>
                  <Button variant="secondary" onClick={() => { const zero = { home: 0, draw: 0, away: 0 }; setProb(zero); void sendProb(zero) }}>Hide (0/0/0)</Button>
                </div>
              </div>
            </Card>
          </div>

          <Card className="h-fit p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Program preview</h2>
            <PreviewFrame matchId={matchId} />
            <p className="mt-2 text-xs text-slate-500">This is exactly what OBS renders (with a pitch background added for the preview).</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
