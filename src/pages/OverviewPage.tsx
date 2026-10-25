import { AlertTriangle, CircleDollarSign, Clock3, Landmark, ShieldCheck, Snowflake } from 'lucide-react'
import { Card } from '../components/Card'
import { DonationTrendChart } from '../components/DonationTrendChart'
import { SectionHeader } from '../components/SectionHeader'
import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import { useDemoStore } from '../hooks/useDemoStore'
import { formatCurrency, formatDateTime } from '../utils/format'

const trendData = [
  { month: 'May', total: 130000 },
  { month: 'Jun', total: 190000 },
  { month: 'Jul', total: 220000 },
  { month: 'Aug', total: 175000 },
  { month: 'Sep', total: 245000 },
  { month: 'Oct', total: 290000 },
]

export const OverviewPage = () => {
  const { state } = useDemoStore()
  const totalDonations = state.donations.reduce((sum, donation) => sum + donation.amountInr, 0)
  const fundsAllocated = state.allocations.reduce((sum, allocation) => sum + allocation.amountInr, 0)
  const verifiedExpenditure = state.evidenceRecords.filter((record) => record.status === 'Verified').reduce((sum, record) => sum + record.amountInr, 0)
  const pendingVerification = state.evidenceRecords.filter((record) => record.status === 'Pending').reduce((sum, record) => sum + record.amountInr, 0)
  const flaggedClaims = state.evidenceRecords.filter((record) => record.status === 'Flagged' || record.status === 'Duplicate').length
  const frozenAllocations = state.allocations.filter((allocation) => allocation.isFrozen).reduce((sum, allocation) => sum + (allocation.amountInr - allocation.releasedInr), 0)

  return (
    <div className="space-y-6">
      <SectionHeader title="Overview" description="Live demo dashboard for transparent education donation flow tracking." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={CircleDollarSign} label="Total donations" value={formatCurrency(totalDonations)} helper="Seeded demo target: ₹12,50,000" />
        <StatCard icon={Landmark} label="Funds allocated" value={formatCurrency(fundsAllocated)} helper="Current allocation pool" />
        <StatCard icon={ShieldCheck} label="Verified expenditure" value={formatCurrency(verifiedExpenditure)} helper="Verified evidence-only total" />
        <StatCard icon={Clock3} label="Pending verification" value={formatCurrency(pendingVerification)} />
        <StatCard icon={AlertTriangle} label="Flagged claims" value={`${flaggedClaims}`} />
        <StatCard icon={Snowflake} label="Frozen allocations" value={formatCurrency(frozenAllocations)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Donation Trends</h3>
          <p className="mb-3 text-sm text-slate-500">Monthly donation volume (demo data)</p>
          <DonationTrendChart data={trendData} />
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
          <div className="mt-3 space-y-3">
            {state.auditLog.slice(0, 5).map((event) => (
              <article key={event.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">{event.action}</p>
                  <StatusBadge value={event.category} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{event.details}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(event.timestamp)}</p>
              </article>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-slate-900">Recent Donations</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">Donation ID</th>
                <th className="py-2">Donor</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Date</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {state.donations.slice(0, 5).map((donation) => (
                <tr key={donation.id} className="border-b border-slate-100">
                  <td className="py-3 font-medium text-slate-900">{donation.id}</td>
                  <td className="py-3">{donation.donor}</td>
                  <td className="py-3">{formatCurrency(donation.amountInr)}</td>
                  <td className="py-3">{donation.date}</td>
                  <td className="py-3"><StatusBadge value={donation.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
