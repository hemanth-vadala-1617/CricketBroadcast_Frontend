import type { ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { Badge, Button, Modal } from '../../components/ui'
import type { Player } from '../../lib/types'
import { assetUrl, initials } from '../../lib/utils'
import { fullName, roleName } from './viewInfo'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0">
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-900">{children}</dd>
    </div>
  )
}

const dash = <span className="text-slate-400">—</span>

// Read-only card with everything stored about a player.
export default function PlayerViewModal({ player: p, isAdmin, onClose, onEdit }: { player: Player; isAdmin: boolean; onClose: () => void; onEdit: () => void }) {
  const photo = assetUrl(p.photoUrl)
  return (
    <Modal open onClose={onClose} title={p.displayName} size="md" footer={<>
      <Button variant="secondary" onClick={onClose}>Close</Button>
      {isAdmin && <Button onClick={onEdit}><Pencil className="size-4" aria-hidden />Edit</Button>}
    </>}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-5">
          {photo
            ? <img src={photo} alt={`Photo of ${p.displayName}`} className="h-44 w-32 rounded-lg border border-slate-200 bg-slate-100 object-cover object-top" />
            : <span aria-label="No photo" className="grid h-44 w-32 place-items-center rounded-lg bg-slate-100 font-display text-4xl font-bold text-slate-400">{initials(p.displayName)}</span>}
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-slate-900">{p.displayName}</h3>
            <p className="text-sm text-slate-500">{p.currentTeamName ?? 'No team'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="blue">{roleName(p.playerRole)}</Badge>
              {p.jerseyNumber > 0 && <Badge>#{p.jerseyNumber}</Badge>}
              <Badge tone={p.isActive ? 'green' : 'amber'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
        </div>

        <dl className="rounded-lg border border-slate-200 px-4">
          <Row label="Full name">{fullName(p)}</Row>
          <Row label="Short name">{p.shortName || dash}</Row>
          <Row label="Team">{p.currentTeamName ?? dash}</Row>
          <Row label="Role">{roleName(p.playerRole)}</Row>
          <Row label="Jersey number">{p.jerseyNumber > 0 ? p.jerseyNumber : dash}</Row>
          <Row label="Batting style">{p.battingStyle || dash}</Row>
          <Row label="Bowling style">{p.bowlingStyle || dash}</Row>
          <Row label="Status">{p.isActive ? 'Active: can be picked in squads' : 'Inactive: hidden from squad pickers'}</Row>
        </dl>
      </div>
    </Modal>
  )
}
