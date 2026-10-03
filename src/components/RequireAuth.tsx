import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import type { Role } from '../lib/types'

export default function RequireAuth({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (!roles.some((r) => user.roles.includes(r))) {
    return (
      <div role="alert" className="mx-auto mt-24 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-bold text-amber-900">You do not have access to this page.</p>
        <p className="mt-1 text-sm text-amber-800">Signed in as {user.email} ({user.roles.join(', ') || 'no role'}). Ask an admin to change your role.</p>
      </div>
    )
  }
  return <>{children}</>
}
