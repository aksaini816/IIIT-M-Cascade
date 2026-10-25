import { Link } from 'react-router-dom'

export const NotFoundPage = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
    <p className="text-sm font-medium uppercase tracking-wide text-slate-500">404</p>
    <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
    <Link className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white" to="/">
      Back to Overview
    </Link>
  </div>
)
