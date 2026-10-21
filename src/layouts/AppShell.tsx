import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, CalendarDays, Layers, LayoutDashboard, LogOut, MapPin, Menu, Palette, Radio, ScrollText, Trophy, Users, UserSquare, X } from 'lucide-react'
import { ADMIN, useAuthStore } from '../store/useAuthStore'
import ThemeToggle from '../components/ThemeToggle'
import { cn } from '../lib/utils'

const link = ({ isActive }: { isActive: boolean }) =>
  cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white')

function Item({ to, icon, children, end }: { to: string; icon: ReactNode; children: ReactNode; end?: boolean }) {
  return <NavLink to={to} end={end} className={link}>{icon}<span>{children}</span></NavLink>
}

/** The menu and the signed-in box: the permanent sidebar on a wide screen, the slide-out drawer on a phone. */
function SidebarBody({ onSignOut }: { onSignOut: () => void }) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = useAuthStore((s) => s.hasRole(...ADMIN))
  return (
    <>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto">
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
      <div className="mt-4"><ThemeToggle variant="segmented" onDark className="w-full justify-between" /></div>
      <div className="mt-3 rounded-lg bg-white/5 p-3 text-xs text-slate-300">
        <div className="flex items-center gap-2"><Layers className="size-3.5 shrink-0" aria-hidden /><span className="truncate">{user?.email}</span></div>
        <div className="mt-1 text-slate-400">{user?.roles.join(', ')}</div>
        <button type="button" onClick={onSignOut} className="mt-3 flex items-center gap-2 font-semibold text-white hover:text-emerald-300">
          <LogOut className="size-3.5" aria-hidden />Sign out
        </button>
      </div>
    </>
  )
}

const Brand = () => (
  <div className="flex items-center gap-2 px-2 text-white">
    <Radio className="size-6 text-emerald-400" aria-hidden />
    <span className="font-display text-xl font-semibold tracking-wide">CRICKET STREAM</span>
  </div>
)

export default function AppShell() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const signOut = () => { logout(); navigate('/login') }

  // the drawer closes when you pick a page, and on Escape
  useEffect(() => { setMenuOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="flex h-full flex-col bg-slate-100 md:flex-row">
      {/* phone / small tablet: a top bar with a menu button */}
      <header className="flex shrink-0 items-center justify-between gap-3 bg-slate-900 px-3 py-2.5 md:hidden">
        <Brand />
        <button type="button" aria-label="Open menu" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(true)}
          className="rounded-lg p-2 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"><Menu className="size-6" aria-hidden /></button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" data-testid="mobile-menu">
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-black/50" />
          <aside id="mobile-menu" role="dialog" aria-label="Menu" className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-slate-900 p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Brand />
              <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"><X className="size-5" aria-hidden /></button>
            </div>
            <SidebarBody onSignOut={signOut} />
          </aside>
        </div>
      )}

      {/* tablet / laptop: the permanent sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 p-4 md:flex">
        <div className="mb-6"><Brand /></div>
        <SidebarBody onSignOut={signOut} />
      </aside>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-3 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
