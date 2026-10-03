import { useState } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { ActionMenu, Button, Checkbox, ColorField, Field, ImageUpload, Input, PageHeader, Table, Td, Th, Truncate } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import type { OverlayTheme, OverlayThemeInput } from '../../lib/types'
import { keys, useSaveMutation, useThemes } from '../../hooks/queries'
import { toast } from '../../store/useToast'
import { assetUrl, contrastText } from '../../lib/utils'
import { rowClick } from './rowClick'
import DetailsModal from './DetailsModal'
import { DeleteDialog, EntityModal, FormGrid, ListCard } from './AdminKit'
import { useDeleteFlow } from './adminHooks'

const blank: OverlayThemeInput = {
  name: '', primaryColor: '#0f6b4f', secondaryColor: '#7a1fa2', accentColor: '#ffd400',
  backgroundUrl: null, logoUrl: null, watermarkUrl: null, watermarkText: null, useTeamColors: false,
}

/** A miniature scorebug painted with the chosen colours, so the admin sees the look before saving. */
function ThemePreview({ theme }: { theme: Pick<OverlayThemeInput, 'primaryColor' | 'secondaryColor' | 'accentColor' | 'watermarkText' | 'backgroundUrl' | 'useTeamColors'> }) {
  // With "use team colours" each bar wears its team's colour (sample: India blue, Australia gold); otherwise both use the primary colour.
  const left = theme.useTeamColors ? '#1d4ed8' : theme.primaryColor
  const right = theme.useTeamColors ? '#facc15' : theme.primaryColor
  return (
    <div aria-label="Theme preview" className="overflow-hidden rounded-lg border border-slate-200" style={{ background: theme.backgroundUrl ? `center / cover url(${assetUrl(theme.backgroundUrl)})` : '#1e293b' }}>
      <div className="flex items-stretch text-sm font-bold">
        <div className="flex-1 px-3 py-2" style={{ background: left, color: contrastText(left) }}>IND <span className="ml-1 text-lg">182-4</span> <span className="text-xs opacity-80">18.2</span></div>
        <div className="px-3 py-2" style={{ background: '#000', color: theme.accentColor }}>4</div>
        <div className="flex-1 px-3 py-2 text-right" style={{ background: right, color: contrastText(right) }}>AUS <span className="text-xs">BOWLING</span></div>
      </div>
      <div className="flex justify-between px-3 py-1 text-xs font-bold" style={{ background: theme.secondaryColor, color: contrastText(theme.secondaryColor) }}>
        <span>CRR: 9.93</span><span>P’SHIP: 41(22)</span><span style={{ color: theme.accentColor }}>{theme.watermarkText || 'LIVE'}</span>
      </div>
    </div>
  )
}

function ThemeModal({ theme, onClose }: { theme: OverlayTheme | null; onClose: () => void }) {
  const [form, setForm] = useState<OverlayThemeInput>(theme ? (({ id: _id, ...rest }) => rest)(theme) : blank)
  const [error, setError] = useState<string | null>(null)
  const save = useSaveMutation<OverlayThemeInput>('/api/themes', [keys.themes])
  const set = <K extends keyof OverlayThemeInput>(k: K, v: OverlayThemeInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  function submit() {
    if (!form.name.trim()) return setError('Enter a theme name.')
    setError(null)
    save.mutate({ id: theme?.id, body: { ...form, watermarkText: form.watermarkText?.trim() || null } }, {
      onSuccess: () => { toast.success(theme ? 'Theme updated.' : 'Theme created.'); onClose() },
      onError: (e) => setError(errorMessage(e)),
    })
  }

  return (
    <EntityModal title={theme ? 'Edit overlay theme' : 'Create overlay theme'} size="lg" onClose={onClose} onSave={submit} saving={save.isPending} error={error}>
      <ThemePreview theme={form} />
      <FormGrid>
        <Field label="Name">{(id) => <Input id={id} autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} />}</Field>
        <Field label="Watermark text" hint="Shown on the right of the info strip, e.g. LIVE.">{(id) => <Input id={id} value={form.watermarkText ?? ''} onChange={(e) => set('watermarkText', e.target.value)} />}</Field>
        <div className="sm:col-span-2">
          <Checkbox label="Use each team's own colour on its score bar (like the TV graphic)" checked={form.useTeamColors} onChange={(e) => set('useTeamColors', e.target.checked)} />
          <p className="mt-1 text-xs text-slate-500">Off: both bars use the primary colour below, so changing it changes the overlay. On: each bar uses its team's colour (set on the Teams page) and the primary colour is only the fallback.</p>
        </div>
        <ColorField label={form.useTeamColors ? 'Primary colour (fallback)' : 'Primary colour (score bars)'} value={form.primaryColor} onChange={(v) => set('primaryColor', v)} />
        <ColorField label="Secondary colour (info strips)" value={form.secondaryColor} onChange={(v) => set('secondaryColor', v)} />
        <ColorField label="Accent colour (highlights)" value={form.accentColor} onChange={(v) => set('accentColor', v)} />
      </FormGrid>
      <FormGrid>
        <ImageUpload label="Background" preset="background" value={form.backgroundUrl} onChange={(v) => set('backgroundUrl', v)} hint="Optional. Overrides the venue's ground picture." />
        <ImageUpload label="Logo" preset="logo" value={form.logoUrl} onChange={(v) => set('logoUrl', v)} />
        <ImageUpload label="Watermark image" preset="watermark" value={form.watermarkUrl} onChange={(v) => set('watermarkUrl', v)} hint="Channel logo or Subscribe button, transparent PNG." />
      </FormGrid>
    </EntityModal>
  )
}

export default function ThemesPage() {
  const themes = useThemes()
  const [editing, setEditing] = useState<OverlayTheme | 'new' | null>(null)
  const [viewing, setViewing] = useState<OverlayTheme | null>(null)
  const del = useDeleteFlow('/api/themes', [keys.themes], 'Theme')

  return (
    <>
      <PageHeader title="Overlay themes" subtitle="Colours, logo and watermark for the broadcast graphics." actions={<Button onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden />Create theme</Button>} />
      <ListCard loading={themes.isLoading} error={themes.error ? errorMessage(themes.error) : null} onRetry={() => void themes.refetch()}
        isEmpty={(themes.data ?? []).length === 0} emptyTitle="No themes yet.">
        <Table head={<tr><Th>Theme</Th><Th>Colours</Th><Th>Watermark</Th><Th className="text-right">Actions</Th></tr>}>
          {(themes.data ?? []).map((t) => (
            <tr key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={rowClick(() => setViewing(t))}>
              <Td><Truncate text={t.name} max="max-w-[14rem]" className="font-semibold text-slate-900" /></Td>
              <Td>
                <div className="flex gap-1">
                  {[t.primaryColor, t.secondaryColor, t.accentColor].map((c) => <span key={c} title={c} className="size-6 rounded border border-slate-200" style={{ background: c }} />)}
                </div>
              </Td>
              <Td>{t.watermarkText ?? '—'}</Td>
              <Td className="text-right">
                <ActionMenu label={`Actions for ${t.name}`} items={[
                  { label: 'View', icon: <Eye className="size-4" aria-hidden />, onSelect: () => setViewing(t) },
                  { label: 'Edit', icon: <Pencil className="size-4" aria-hidden />, onSelect: () => setEditing(t) },
                  { label: 'Delete', icon: <Trash2 className="size-4" aria-hidden />, onSelect: () => del.ask(t.id, t.name), danger: true },
                ]} />
              </Td>
            </tr>
          ))}
        </Table>
      </ListCard>
      {viewing && (
        <DetailsModal title={viewing.name} canEdit onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null) }}
          header={<ThemePreview theme={viewing} />}
          rows={[
            { label: 'Primary', value: <span className="flex items-center gap-2"><span className="size-5 rounded border border-slate-200" style={{ background: viewing.primaryColor }} />{viewing.primaryColor}</span> },
            { label: 'Secondary', value: <span className="flex items-center gap-2"><span className="size-5 rounded border border-slate-200" style={{ background: viewing.secondaryColor }} />{viewing.secondaryColor}</span> },
            { label: 'Accent', value: <span className="flex items-center gap-2"><span className="size-5 rounded border border-slate-200" style={{ background: viewing.accentColor }} />{viewing.accentColor}</span> },
            { label: 'Team colours', value: viewing.useTeamColors ? 'Each score bar uses its team colour' : 'Both bars use the primary colour' },
            { label: 'Watermark text', value: viewing.watermarkText },
          ]} />
      )}
      {editing && <ThemeModal key={editing === 'new' ? 'new' : editing.id} theme={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <DeleteDialog flow={del} noun="theme" extra="Matches and tournaments using it fall back to no theme." />
    </>
  )
}
