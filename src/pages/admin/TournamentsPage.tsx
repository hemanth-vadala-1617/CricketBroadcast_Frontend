import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Field, FilterBar, ImageUpload, Input, PageHeader, SearchBox, Select, Table, Td, Textarea, Th } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import type { MatchFormat, Tournament, TournamentInput } from '../../lib/types'
import { keys, useRules, useSaveMutation, useThemes, useTournaments } from '../../hooks/queries'
import { toast } from '../../store/useToast'
import { DeleteDialog, EntityModal, FormGrid, ListCard } from './AdminKit'
import { useDeleteFlow, useIsAdmin } from './adminHooks'

const FORMATS: MatchFormat[] = ['T20', 'ODI', 'TEST', 'CUSTOM']
const STATUSES = ['Upcoming', 'Live', 'Completed']
const day = (iso: string) => iso.slice(0, 10)
const toIso = (d: string) => new Date(`${d}T00:00:00Z`).toISOString()

function TournamentModal({ tournament, onClose }: { tournament: Tournament | null; onClose: () => void }) {
  const rules = useRules()
  const themes = useThemes()
  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
    name: tournament?.name ?? '', shortName: tournament?.shortName ?? '', season: tournament?.season ?? String(new Date().getFullYear()),
    format: (tournament?.format ?? 'T20') as MatchFormat, startDate: tournament ? day(tournament.startDate) : today, endDate: tournament ? day(tournament.endDate) : today,
    status: tournament?.status ?? 'Upcoming', description: tournament?.description ?? '', logoUrl: tournament?.logoUrl ?? null,
    defaultMatchRulesId: tournament?.defaultMatchRulesId ?? '', overlayThemeId: tournament?.overlayThemeId ?? '',
    }
  })
  const [error, setError] = useState<string | null>(null)
  const save = useSaveMutation<TournamentInput>('/api/tournaments', [keys.tournaments])
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  function submit() {
    if (!form.name.trim()) return setError('Enter the tournament name.')
    if (!form.shortName.trim()) return setError('Enter a short name (e.g. IPL).')
    if (!form.startDate || !form.endDate) return setError('Pick the start and end dates.')
    if (form.endDate < form.startDate) return setError('The end date is before the start date.')
    setError(null)
    const body: TournamentInput = {
      name: form.name.trim(), shortName: form.shortName.trim(), season: form.season.trim(), format: form.format,
      startDate: toIso(form.startDate), endDate: toIso(form.endDate), logoUrl: form.logoUrl, status: form.status,
      description: form.description.trim() || null, defaultMatchRulesId: form.defaultMatchRulesId || null, overlayThemeId: form.overlayThemeId || null,
    }
    save.mutate({ id: tournament?.id, body }, {
      onSuccess: () => { toast.success(tournament ? 'Tournament updated.' : 'Tournament created.'); onClose() },
      onError: (e) => setError(errorMessage(e)),
    })
  }

  return (
    <EntityModal title={tournament ? 'Edit tournament' : 'Create tournament'} size="lg" onClose={onClose} onSave={submit} saving={save.isPending} error={error}>
      <FormGrid>
        <Field label="Name">{(id) => <Input id={id} autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} />}</Field>
        <Field label="Short name">{(id) => <Input id={id} value={form.shortName} maxLength={20} onChange={(e) => set('shortName', e.target.value)} />}</Field>
        <Field label="Season">{(id) => <Input id={id} value={form.season} onChange={(e) => set('season', e.target.value)} />}</Field>
        <Field label="Format">{(id) => <Select id={id} value={form.format} onChange={(e) => set('format', e.target.value as MatchFormat)}>{FORMATS.map((f) => <option key={f}>{f}</option>)}</Select>}</Field>
        <Field label="Start date">{(id) => <Input id={id} type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />}</Field>
        <Field label="End date">{(id) => <Input id={id} type="date" value={form.endDate} min={form.startDate} onChange={(e) => set('endDate', e.target.value)} />}</Field>
        <Field label="Status">{(id) => <Select id={id} value={form.status} onChange={(e) => set('status', e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>}</Field>
        <Field label="Default match rules" hint="Pre-fills new matches.">
          {(id) => (
            <Select id={id} value={form.defaultMatchRulesId} onChange={(e) => set('defaultMatchRulesId', e.target.value)}>
              <option value="">None</option>
              {(rules.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Overlay theme" hint="Colours and watermark for this tournament.">
          {(id) => (
            <Select id={id} value={form.overlayThemeId} onChange={(e) => set('overlayThemeId', e.target.value)}>
              <option value="">None</option>
              {(themes.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          )}
        </Field>
      </FormGrid>
      <Field label="Description">{(id) => <Textarea id={id} value={form.description} onChange={(e) => set('description', e.target.value)} />}</Field>
      <ImageUpload label="Logo" preset="logo" value={form.logoUrl} onChange={(v) => set('logoUrl', v)} />
    </EntityModal>
  )
}

export default function TournamentsPage() {
  const isAdmin = useIsAdmin()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Tournament | 'new' | null>(null)
  const tournaments = useTournaments()
  const rules = useRules()
  const themes = useThemes()
  const del = useDeleteFlow('/api/tournaments', [keys.tournaments], 'Tournament')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (tournaments.data ?? []).filter((t) => (!q || `${t.name} ${t.shortName} ${t.season}`.toLowerCase().includes(q)) && (!status || t.status === status))
  }, [tournaments.data, search, status])
  const filtered = search !== '' || status !== ''
  const ruleName = (id: string | null) => (rules.data ?? []).find((r) => r.id === id)?.name ?? '—'
  const themeName = (id: string | null) => (themes.data ?? []).find((t) => t.id === id)?.name ?? '—'

  return (
    <>
      <PageHeader title="Tournaments" subtitle="IPL, World Cup, bilateral series. Defaults here pre-fill each match." />
      <FilterBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search tournaments…" />
        <Select aria-label="Filter by status" className="w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </Select>
        {filtered && <Button variant="ghost" onClick={() => { setSearch(''); setStatus('') }}>Clear filters</Button>}
        {isAdmin && <Button onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden />Create tournament</Button>}
      </FilterBar>
      <ListCard loading={tournaments.isLoading} error={tournaments.error ? errorMessage(tournaments.error) : null} onRetry={() => void tournaments.refetch()}
        isEmpty={rows.length === 0} emptyTitle={filtered ? 'No tournaments match these filters.' : 'No tournaments yet.'} emptyHint={filtered ? undefined : 'Create one before scheduling matches.'}>
        <Table head={<tr><Th>Tournament</Th><Th>Format</Th><Th>Dates</Th><Th>Rules</Th><Th>Theme</Th><Th>Status</Th>{isAdmin && <Th className="text-right">Actions</Th>}</tr>}>
          {rows.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <Td><div className="font-semibold text-slate-900">{t.name}</div><div className="text-xs text-slate-500">{t.shortName} · {t.season}</div></Td>
              <Td><Badge tone="blue">{t.format}</Badge></Td>
              <Td className="whitespace-nowrap text-xs">{day(t.startDate)} â†’ {day(t.endDate)}</Td>
              <Td>{ruleName(t.defaultMatchRulesId)}</Td>
              <Td>{themeName(t.overlayThemeId)}</Td>
              <Td><Badge tone={t.status === 'Live' ? 'green' : t.status === 'Completed' ? 'purple' : 'gray'}>{t.status}</Badge></Td>
              {isAdmin && (
                <Td className="text-right">
                  <Button size="sm" variant="ghost" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => del.ask(t.id, t.name)}><Trash2 className="size-4 text-red-600" /></Button>
                </Td>
              )}
            </tr>
          ))}
        </Table>
      </ListCard>
      {editing && <TournamentModal key={editing === 'new' ? 'new' : editing.id} tournament={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <DeleteDialog flow={del} noun="tournament" extra="A tournament that has matches cannot be deleted." />
    </>
  )
}

