import { create } from 'zustand'
import type { AuthResponse, AuthUser, Role } from '../lib/types'
import { API_URL } from '../lib/utils'

const KEY = 'cs.auth.v1'

interface Persisted { token: string; refreshToken: string; user: AuthUser }

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Persisted) : null
  } catch { return null }
}
function save(p: Persisted | null) {
  try { if (p) localStorage.setItem(KEY, JSON.stringify(p)); else localStorage.removeItem(KEY) } catch { /* private mode */ }
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: AuthUser | null
  setSession: (r: AuthResponse) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
}

const initial = load()

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initial?.token ?? null,
  refreshToken: initial?.refreshToken ?? null,
  user: initial?.user ?? null,

  setSession: (r) => {
    const user: AuthUser = { userId: r.userId, email: r.email, roles: r.roles }
    save({ token: r.token, refreshToken: r.refreshToken, user })
    set({ token: r.token, refreshToken: r.refreshToken, user })
  },

  login: async (email, password) => {
    let res: Response
    try {
      res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      })
    } catch { throw new Error('Cannot reach the server. Check that the API is running.') }
    if (!res.ok) {
      let detail = ''
      try { detail = ((await res.json()) as { detail?: string }).detail ?? '' } catch { /* empty */ }
      throw new Error(detail || (res.status === 429 ? 'Too many attempts. Wait a minute.' : 'Sign-in failed.'))
    }
    get().setSession((await res.json()) as AuthResponse)
  },

  logout: () => {
    const { refreshToken } = get()
    if (refreshToken) void fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: get().token ?? '-', refreshToken }),
    }).catch(() => undefined)
    save(null)
    set({ token: null, refreshToken: null, user: null })
  },

  hasRole: (...roles) => {
    const user = get().user
    return !!user && roles.some((r) => user.roles.includes(r))
  },
}))

export const STAFF: Role[] = ['SuperAdmin', 'Admin', 'Scorer', 'Producer']
export const ADMIN: Role[] = ['SuperAdmin', 'Admin']
export const SCORING: Role[] = ['SuperAdmin', 'Admin', 'Scorer']
export const GRAPHICS: Role[] = ['SuperAdmin', 'Admin', 'Producer', 'Scorer']

