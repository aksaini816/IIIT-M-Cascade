import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { SectionHeader } from '../components/SectionHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useDemoStore } from '../hooks/useDemoStore'
import type { Donation, DonationStatus } from '../types'
import { formatCurrency } from '../utils/format'

const statusFilters: Array<'All' | DonationStatus> = ['All', 'Received', 'Allocated', 'Verified', 'Pending', 'Flagged']

export const DonationsPage = () => {
  const { state, createDonation } = useDemoStore()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<typeof statusFilters[number]>('All')
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ donor: '', amountInr: '', date: '', purpose: '', ngoId: '' })
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    return state.donations.filter((donation) => {
      const term = search.toLowerCase().trim()
      const matchesSearch =
        !term ||
        donation.id.toLowerCase().includes(term) ||
        donation.purpose.toLowerCase().includes(term) ||
        donation.ngoId.toLowerCase().includes(term)
      const matchesStatus = status === 'All' || donation.status === status
      return matchesSearch && matchesStatus
    })
  }, [search, status, state.donations])

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!form.donor || !form.purpose || !form.ngoId || !form.date || Number(form.amountInr) <= 0) {
      setError('Please complete all fields with a valid amount.')
      return
    }

    setIsSubmitting(true)
    window.setTimeout(() => {
      createDonation({
        donor: form.donor,
        amountInr: Number(form.amountInr),
        date: form.date,
        purpose: form.purpose,
        ngoId: form.ngoId,
      })
      setForm({ donor: '', amountInr: '', date: '', purpose: '', ngoId: '' })
      setIsSubmitting(false)
    }, 500)
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Donations" description="Search, review, and create demo donation records." />

      <Card>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={onSubmit}>
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Donor" value={form.donor} onChange={(e) => setForm({ ...form, donor: e.target.value })} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Amount (INR)" type="number" value={form.amountInr} onChange={(e) => setForm({ ...form, amountInr: e.target.value })} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="NGO ID" value={form.ngoId} onChange={(e) => setForm({ ...form, ngoId: e.target.value })} />
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60">
            {isSubmitting ? 'Creating...' : 'Create Demo Donation'}
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" placeholder="Search by ID, purpose, NGO" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {statusFilters.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No donations found" body="Try adjusting your filters or create a new demo donation." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Donation ID</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Purpose</th>
                  <th className="py-2">NGO ID</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((donation) => (
                  <tr key={donation.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">{donation.id}</td>
                    <td className="py-3">{formatCurrency(donation.amountInr)}</td>
                    <td className="py-3">{donation.date}</td>
                    <td className="py-3">{donation.purpose}</td>
                    <td className="py-3">{donation.ngoId}</td>
                    <td className="py-3"><StatusBadge value={donation.status} /></td>
                    <td className="py-3">
                      <button type="button" className="text-sm font-medium text-cyan-700 hover:underline" onClick={() => setSelectedDonation(donation)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedDonation ? (
        <div className="fixed inset-0 z-40 flex items-center justify-end bg-slate-950/40">
          <div className="h-full w-full max-w-md bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Donation Details</h3>
              <button type="button" className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setSelectedDonation(null)}>
                Close
              </button>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-slate-500">Donation ID</dt><dd className="font-medium text-slate-900">{selectedDonation.id}</dd></div>
              <div><dt className="text-slate-500">Donor</dt><dd className="font-medium text-slate-900">{selectedDonation.donor}</dd></div>
              <div><dt className="text-slate-500">Amount</dt><dd className="font-medium text-slate-900">{formatCurrency(selectedDonation.amountInr)}</dd></div>
              <div><dt className="text-slate-500">Date</dt><dd className="font-medium text-slate-900">{selectedDonation.date}</dd></div>
              <div><dt className="text-slate-500">Purpose</dt><dd className="font-medium text-slate-900">{selectedDonation.purpose}</dd></div>
              <div><dt className="text-slate-500">NGO</dt><dd className="font-medium text-slate-900">{selectedDonation.ngoId}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd className="pt-1"><StatusBadge value={selectedDonation.status} /></dd></div>
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  )
}
