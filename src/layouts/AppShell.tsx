import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Activity, CalendarDays, Layers, LayoutDashboard, LogOut, MapPin, Palette, Radio, ScrollText, Trophy, Users, UserSquare } from 'lucide-react'
import { ADMIN, useAuthStore } from '../store/useAuthStore'
import { cn } from '../lib/utils'
import type { ReactNode } from 'react'

const link = ({ isActive }: { isActive: boolean }) =>
  cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white')

function Item({ to, icon, children, end }: { to: string; icon: ReactNode; children: ReactNode; end?: boolean }) {
  return <NavLink to={to} end={end} className={link}>{icon}<span>{children}</span></NavLink>
}

export default function AppShell() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = useAuthStore((s) => s.hasRole(...ADMIN))
  const navigate = useNavigate()

  return (
    <div className="flex h-full bg-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 text-white">
          <Radio className="size-6 text-emerald-400" aria-hidden />
          <span className="font-display text-xl font-semibold tracking-wide">CRICKET STREAM</span>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          <Item to="/admin" end icon={<LayoutDashboard className="size-4" />}>Dashboard</Item>
          <Item to="/admin/matches" icon={<CalendarDays className="size-4" />}>Matches</Item>
          <Item to="/admin/tournaments" icon={<Trophy className="size-4" />}>Tournaments</Item>
          <Item to="/admin/teams" icon={<Users className="size-4" />}>Teams</Item>
          <Item to="/admin/players" icon={<UserSquare className="size-4" />}>Players</Item>
          <Item to="/admin/venues" icon={<MapPin className="size-4" />}>Venues</Item>
          {isAdmin && <Item to="/admin/rules" icon={<ScrollText className="size-4" />}>Match rules</Item>}
          {isAdmin && <Item to="/admin/themes" icon={<Palette className="size-4" />}>Overlay themes</Item>}
          <div className="mt-4 border-t border-white/10 pt-4">
            <Item to="/" end icon={<Activity className="size-4" />}>Public page</Item>
          </div>
        </nav>
        <div className="mt-4 rounded-lg bg-white/5 p-3 text-xs text-slate-300">
          <div className="flex items-center gap-2"><Layers className="size-3.5" aria-hidden /><span className="truncate">{user?.email}</span></div>
          <div className="mt-1 text-slate-400">{user?.roles.join(', ')}</div>
          <button type="button" onClick={() => { logout(); navigate('/login') }} className="mt-3 flex items-center gap-2 font-semibold text-white hover:text-emerald-300">
            <LogOut className="size-3.5" aria-hidden />Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
