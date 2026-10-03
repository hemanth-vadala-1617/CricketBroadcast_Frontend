import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="grid min-h-full place-items-center p-8 text-center">
      <div>
        <p className="font-display text-6xl font-bold text-slate-300">404</p>
        <p className="mt-2 text-lg font-semibold text-slate-700">That page does not exist.</p>
        <Link to="/" className="mt-4 inline-block font-semibold text-brand hover:underline">Go to the home page</Link>
      </div>
    </div>
  )
}
