import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface Props {
  children: ReactNode
  /** Custom fallback; defaults to a full-page message with Reload. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** When this value changes (e.g. the route) the boundary clears itself and tries again. */
  resetKey?: string
}
interface State { error: Error | null }

/** True when a lazy chunk or dependency could not be fetched (stale dev server, deploy in progress, offline). */
export function isLoadFailure(error: Error): boolean {
  return /dynamically imported module|Importing a module script failed|Failed to fetch|Outdated Optimize Dep|ChunkLoadError/i.test(`${error.name} ${error.message}`)
}

/** Without this, any render error leaves the user on a blank white page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) { console.error('UI error:', error, info.componentStack) }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    const load = isLoadFailure(error)
    return (
      <div role="alert" className="mx-auto mt-24 max-w-lg rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-bold text-slate-900">{load ? 'Part of the app could not be loaded' : 'Something went wrong on this page'}</p>
        <p className="mt-2 text-sm text-slate-600">
          {load
            ? 'The development server was probably restarted or updated while this page was open. Reload the page to fetch the latest files.'
            : 'The error has been logged in the browser console. You can try again, or reload the page.'}
        </p>
        <pre className="mt-3 max-h-32 overflow-auto rounded bg-slate-100 p-2 text-xs text-slate-700">{error.message}</pre>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Reload page</button>
          <button type="button" onClick={this.reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Try again</button>
        </div>
      </div>
    )
  }
}

/** Boundary that clears itself when the user navigates to another page. */
export function RouteBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
}
