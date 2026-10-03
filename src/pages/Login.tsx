import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Radio } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { Button, Field, Input } from '../components/ui'

export default function Login() {
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/admin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-full place-items-center bg-slate-900 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl" aria-label="Sign in">
        <div className="mb-6 flex items-center gap-2 text-slate-900">
          <Radio className="size-7 text-brand" aria-hidden />
          <span className="font-display text-2xl font-semibold tracking-wide">CRICKET STREAM</span>
        </div>
        <div className="flex flex-col gap-4">
          <Field label="Email">{(id) => <Input id={id} type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Password">{(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" size="lg" loading={busy}>Sign in</Button>
        </div>
      </form>
    </div>
  )
}
