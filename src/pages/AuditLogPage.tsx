import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { SectionHeader } from '../components/SectionHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useDemoStore } from '../hooks/useDemoStore'
import { formatDateTime } from '../utils/format'

const categories = ['All', 'Donation', 'Evidence', 'Fraud', 'Escrow', 'System'] as const

export const AuditLogPage = () => {
  const { state } = useDemoStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<(typeof categories)[number]>('All')

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return state.auditLog.filter((event) => {
      const matchesCategory = category === 'All' || event.category === category
      const matchesSearch = !term || event.action.toLowerCase().includes(term) || event.details.toLowerCase().includes(term)
      return matchesCategory && matchesSearch
    })
  }, [category, search, state.auditLog])

  return (
    <div className="space-y-6">
      <SectionHeader title="Audit Log" description="Timestamped demo events from donations, evidence, fraud alerts, and escrow actions." />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" placeholder="Search actions or details" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}>
            {categories.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No audit events match" body="Try broadening your search or changing category filter." />
        ) : (
          <div className="space-y-3">
            {filtered.map((event) => (
              <article key={event.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{event.action}</p>
                  <StatusBadge value={event.category} />
                </div>
                <p className="mt-1 text-sm text-slate-600">{event.details}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(event.timestamp)}</p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
