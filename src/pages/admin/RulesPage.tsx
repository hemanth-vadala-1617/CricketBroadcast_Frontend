import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Checkbox, Field, Input, NumberInput, PageHeader, Table, Td, Th } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import type { MatchRules, MatchRulesInput } from '../../lib/types'
import { keys, useRules, useSaveMutation } from '../../hooks/queries'
import { toast } from '../../store/useToast'
import { DeleteDialog, EntityModal, FormGrid, ListCard } from './AdminKit'
import { useDeleteFlow } from './adminHooks'

const blank: MatchRulesInput = {
  name: '', isTest: false, ballsPerOver: 6, oversPerInnings: 20, maxOversPerBowler: 4, powerplayOvers: 6, wideRuns: 1, noBallRuns: 1,
  freeHitEnabled: true, followOnEnabled: false, inningsPerSide: 1, days: 1, oversPerDay: 0, sessionsPerDay: 1, newBallAfterOvers: 0, followOnMargin: 200,
}
const TEST_DEFAULTS: Partial<MatchRulesInput> = {
  oversPerInnings: 0, maxOversPerBowler: 0, powerplayOvers: 0, freeHitEnabled: false, followOnEnabled: true, inningsPerSide: 2,
  days: 5, oversPerDay: 90, sessionsPerDay: 3, newBallAfterOvers: 80, followOnMargin: 200,
}
const LIMITED_DEFAULTS: Partial<MatchRulesInput> = {
  oversPerInnings: 20, maxOversPerBowler: 4, powerplayOvers: 6, freeHitEnabled: true, followOnEnabled: false, inningsPerSide: 1,
  days: 1, oversPerDay: 0, sessionsPerDay: 1, newBallAfterOvers: 0,
}

function RulesModal({ rules, onClose }: { rules: MatchRules | null; onClose: () => void }) {
  const [form, setForm] = useState<MatchRulesInput>(rules ? (({ id: _id, ...rest }) => rest)(rules) : blank)
  const [error, setError] = useState<string | null>(null)
  const save = useSaveMutation<MatchRulesInput>('/api/match-rules', [keys.rules])
  const set = <K extends keyof MatchRulesInput>(k: K, v: MatchRulesInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  function submit() {
    if (!form.name.trim()) return setError('Enter a name for these rules.')
    if (!form.isTest && form.oversPerInnings <= 0) return setError('Limited-overs rules need overs per innings.')
    setError(null)
    save.mutate({ id: rules?.id, body: form }, {
      onSuccess: () => { toast.success(rules ? 'Rules updated.' : 'Rules created.'); onClose() },
      onError: (e) => setError(errorMessage(e)),
    })
  }

  return (
    <EntityModal title={rules ? 'Edit match rules' : 'Create match rules'} size="lg" onClose={onClose} onSave={submit} saving={save.isPending} error={error}>
      <FormGrid>
        <Field label="Name">{(id) => <Input id={id} autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} />}</Field>
        <div className="flex items-end pb-2">
          <Checkbox label="Test match (days & sessions)" checked={form.isTest} onChange={(e) => setForm((f) => ({ ...f, isTest: e.target.checked, ...(e.target.checked ? TEST_DEFAULTS : LIMITED_DEFAULTS) }))} />
        </div>
        <Field label="Balls per over">{(id) => <NumberInput id={id} min={1} max={12} value={form.ballsPerOver} onValueChange={(n) => set('ballsPerOver', n)} />}</Field>
        <Field label="Overs per innings" hint="0 = unlimited (Test).">{(id) => <NumberInput id={id} min={0} value={form.oversPerInnings} onValueChange={(n) => set('oversPerInnings', n)} />}</Field>
        <Field label="Max overs per bowler" hint="0 = unlimited.">{(id) => <NumberInput id={id} min={0} value={form.maxOversPerBowler} onValueChange={(n) => set('maxOversPerBowler', n)} />}</Field>
        <Field label="Powerplay overs" hint="0 = none.">{(id) => <NumberInput id={id} min={0} value={form.powerplayOvers} onValueChange={(n) => set('powerplayOvers', n)} />}</Field>
        <Field label="Runs for a wide">{(id) => <NumberInput id={id} min={0} max={5} value={form.wideRuns} onValueChange={(n) => set('wideRuns', n)} />}</Field>
        <Field label="Runs for a no-ball">{(id) => <NumberInput id={id} min={0} max={5} value={form.noBallRuns} onValueChange={(n) => set('noBallRuns', n)} />}</Field>
      </FormGrid>
      <Checkbox label="Free hit after a no-ball" checked={form.freeHitEnabled} onChange={(e) => set('freeHitEnabled', e.target.checked)} />
      {form.isTest && (
        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Test match clock</legend>
          <FormGrid>
            <Field label="Innings per side">{(id) => <NumberInput id={id} min={1} max={2} value={form.inningsPerSide} onValueChange={(n) => set('inningsPerSide', n)} />}</Field>
            <Field label="Days">{(id) => <NumberInput id={id} min={1} max={7} value={form.days} onValueChange={(n) => set('days', n)} />}</Field>
            <Field label="Overs per day">{(id) => <NumberInput id={id} min={0} value={form.oversPerDay} onValueChange={(n) => set('oversPerDay', n)} />}</Field>
            <Field label="Sessions per day">{(id) => <NumberInput id={id} min={1} max={4} value={form.sessionsPerDay} onValueChange={(n) => set('sessionsPerDay', n)} />}</Field>
            <Field label="New ball after (overs)" hint="0 = never prompt.">{(id) => <NumberInput id={id} min={0} value={form.newBallAfterOvers} onValueChange={(n) => set('newBallAfterOvers', n)} />}</Field>
            <Field label="Follow-on margin (runs)">{(id) => <NumberInput id={id} min={0} value={form.followOnMargin} disabled={!form.followOnEnabled} onValueChange={(n) => set('followOnMargin', n)} />}</Field>
          </FormGrid>
          <div className="mt-3"><Checkbox label="Follow-on allowed" checked={form.followOnEnabled} onChange={(e) => set('followOnEnabled', e.target.checked)} /></div>
        </fieldset>
      )}
    </EntityModal>
  )
}

export default function RulesPage() {
  const rules = useRules()
  const [editing, setEditing] = useState<MatchRules | 'new' | null>(null)
  const del = useDeleteFlow('/api/match-rules', [keys.rules], 'Rules')
  const summary = (r: MatchRules) => r.isTest
    ? `${r.days} days · ${r.oversPerDay} overs/day · ${r.sessionsPerDay} sessions`
    : `${r.oversPerInnings} overs · max ${r.maxOversPerBowler || '∞'}/bowler · PP ${r.powerplayOvers || 'none'}`

  return (
    <>
      <PageHeader title="Match rules" subtitle="Presets for T20, ODI, T10 and Test. A match uses one set of rules." actions={<Button onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden />Create rules</Button>} />
      <ListCard loading={rules.isLoading} error={rules.error ? errorMessage(rules.error) : null} onRetry={() => void rules.refetch()}
        isEmpty={(rules.data ?? []).length === 0} emptyTitle="No rules yet.">
        <Table head={<tr><Th>Name</Th><Th>Type</Th><Th>Summary</Th><Th>Wide / No-ball</Th><Th>Free hit</Th><Th className="text-right">Actions</Th></tr>}>
          {(rules.data ?? []).map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <Td className="font-semibold text-slate-900">{r.name}</Td>
              <Td><Badge tone={r.isTest ? 'purple' : 'blue'}>{r.isTest ? 'Test' : 'Limited overs'}</Badge></Td>
              <Td className="text-xs">{summary(r)}</Td>
              <Td>{r.wideRuns} / {r.noBallRuns}</Td>
              <Td>{r.freeHitEnabled ? 'Yes' : 'No'}</Td>
              <Td className="text-right">
                <Button size="sm" variant="ghost" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}><Pencil className="size-4" /></Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${r.name}`} onClick={() => del.ask(r.id, r.name)}><Trash2 className="size-4 text-red-600" /></Button>
              </Td>
            </tr>
          ))}
        </Table>
      </ListCard>
      {editing && <RulesModal key={editing === 'new' ? 'new' : editing.id} rules={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <DeleteDialog flow={del} noun="rules" extra="Rules used by a match cannot be deleted." />
    </>
  )
}


