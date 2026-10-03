import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { Badge, Button, Modal, Spinner, StatusBadge, Table, TeamBadge, Td, Th } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import type { MatchStatus, Tournament } from '../../lib/types'
import { assetUrl, formatDateTime } from '../../lib/utils'
import { useMatches, useRules, useThemes } from '../../hooks/queries'
import { daySpan, formatDay, rulesSummary, summariseMatches } from './viewInfo'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-900">{children}</dd>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center">
      <div className={`font-display text-2xl font-bold ${tone ?? 'text-slate-900'}`}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  )
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span aria-hidden className="size-5 rounded border border-slate-300" style={{ background: color }} />{label} <span className="font-mono text-slate-400">{color}</span>
    </span>
  )
}

// Read-only view of a tournament and everything connected to it: rules, theme, matches and teams.
export default function TournamentViewModal({ tournament: t, isAdmin, onClose, onEdit }: { tournament: Tournament; isAdmin: boolean; onClose: () => void; onEdit: () => void }) {
  const rules = useRules()
  const themes = useThemes()
  const matches = useMatches({ tournamentId: t.id })
  const rule = (rules.data ?? []).find((r) => r.id === t.defaultMatchRulesId)
  const theme = (themes.data ?? []).find((x) => x.id === t.overlayThemeId)
  const list = matches.data ?? []
  const totals = summariseMatches(list)
  const days = daySpan(t.startDate, t.endDate)
  const logo = assetUrl(t.logoUrl)

  return (
    <Modal open onClose={onClose} title={t.name} size="xl" footer={<>
      <Button variant="secondary" onClick={onClose}>Close</Button>
      {isAdmin && <Button onClick={onEdit}><Pencil className="size-4" aria-hidden />Edit</Button>}
    </>}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-4">
          {logo
            ? <img src={logo} alt={`${t.name} logo`} className="size-20 rounded-lg border border-slate-200 bg-white object-contain p-1" />
            : <span aria-hidden className="grid size-20 place-items-center rounded-lg bg-slate-100 font-display text-xl font-bold text-slate-500">{t.shortName.slice(0, 4)}</span>}
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-slate-900">{t.name}</h3>
            <p className="text-sm text-slate-500">{t.shortName} · {t.season}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="blue">{t.format}</Badge>
              <Badge tone={t.status === 'Live' ? 'green' : t.status === 'Completed' ? 'purple' : 'gray'}>{t.status}</Badge>
            </div>
          </div>
        </div>

        <dl className="rounded-lg border border-slate-200 px-4">
          <Row label="Dates">{formatDay(t.startDate)} → {formatDay(t.endDate)}{days > 0 && <span className="ml-2 text-slate-500">({days} {days === 1 ? 'day' : 'days'})</span>}</Row>
          <Row label="Description">{t.description?.trim() ? <span className="whitespace-pre-line">{t.description}</span> : <span className="text-slate-400">No description</span>}</Row>
          <Row label="Default match rules">
            {rule ? <><span className="font-semibold">{rule.name}</span><span className="block text-xs text-slate-500">{rulesSummary(rule)}</span></> : <span className="text-slate-400">None. Pick the rules for each match.</span>}
          </Row>
          <Row label="Overlay theme">
            {theme ? (
              <div className="flex flex-col gap-2">
                <span className="font-semibold">{theme.name}</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1"><Swatch color={theme.primaryColor} label="Primary" /><Swatch color={theme.secondaryColor} label="Secondary" /><Swatch color={theme.accentColor} label="Accent" /></div>
                {(theme.backgroundUrl || theme.logoUrl || theme.watermarkUrl || theme.watermarkText) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {theme.backgroundUrl && <img src={assetUrl(theme.backgroundUrl)} alt="Theme background" className="h-14 w-24 rounded border border-slate-200 object-cover" />}
                    {theme.logoUrl && <img src={assetUrl(theme.logoUrl)} alt="Theme logo" className="h-14 rounded border border-slate-200 bg-white object-contain p-1" />}
                    {theme.watermarkUrl && <img src={assetUrl(theme.watermarkUrl)} alt="Theme watermark" className="h-14 rounded border border-slate-200 bg-slate-800 object-contain p-1" />}
                    {theme.watermarkText && <Badge tone="red">{theme.watermarkText}</Badge>}
                  </div>
                )}
              </div>
            ) : <span className="text-slate-400">None</span>}
          </Row>
        </dl>

        <section aria-label="Matches in this tournament">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Matches</h3>
          {matches.isLoading ? <Spinner label="Loading matches…" /> : matches.error ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage(matches.error)}</p>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Matches" value={totals.total} />
                <Stat label="Live" value={totals.live} tone="text-emerald-600" />
                <Stat label="Upcoming" value={totals.upcoming} tone="text-amber-600" />
                <Stat label="Completed" value={totals.completed} tone="text-purple-700" />
              </div>
              {totals.teams.length > 0 && (
                <p className="mb-3 flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-slate-500">Teams:</span>{totals.teams.map((n) => <Badge key={n}>{n}</Badge>)}</p>
              )}
              {list.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">No matches scheduled in this tournament yet.</p> : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <Table head={<tr><Th>Match</Th><Th>Venue</Th><Th>Start</Th><Th>Status</Th><Th className="text-right">Open</Th></tr>}>
                    {list.map((m) => (
                      <tr key={m.id}>
                        <Td>
                          <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <TeamBadge team={{ name: m.homeTeamName, shortName: m.homeShortName, logoUrl: null, primaryColor: null }} size={24} />
                            {m.homeTeamName} <span className="text-xs font-medium text-slate-400">vs</span> {m.awayTeamName}
                            <TeamBadge team={{ name: m.awayTeamName, shortName: m.awayShortName, logoUrl: null, primaryColor: null }} size={24} />
                          </div>
                          {m.resultText && <div className="text-xs text-slate-500">{m.resultText}</div>}
                        </Td>
                        <Td>{m.venueName}</Td>
                        <Td className="whitespace-nowrap text-xs">{formatDateTime(m.scheduledStart)}</Td>
                        <Td><StatusBadge status={m.status as MatchStatus} /></Td>
                        <Td className="whitespace-nowrap text-right text-xs font-semibold">
                          <Link to={`/admin/matches/${m.id}/scorecard`} className="mr-3 text-brand hover:underline">Scorecard</Link>
                          <Link to={`/admin/matches/${m.id}`} className="text-brand hover:underline">Match</Link>
                        </Td>
                      </tr>
                    ))}
                  </Table>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </Modal>
  )
}
