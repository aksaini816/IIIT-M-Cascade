import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiFetch } from '../../lib/api'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { EmptyState, ErrorBanner, LoadingSkeleton } from '../../components/ui/States'

type Campaign = { id: string; title?: string; name?: string; confirmedRaisedPaise?: number; targetAmountPaise?: number; verifiedSpendPaise?: number }
type Allocation = { approvedBudgetPaise: number; reservedPaise: number; disbursedPaise: number; purpose: string; status: string }
type DashboardData = { campaigns: Campaign[]; allocations: Allocation[]; expenses: Array<{ status?: string; amountPaise?: number }>; fraud: Array<{ severity?: string; isBlocking?: boolean }>; exceptions: unknown[] }

const emptyData: DashboardData = { campaigns: [], allocations: [], expenses: [], fraud: [], exceptions: [] }
async function loadDashboard(): Promise<DashboardData> {
  const [campaigns, allocations, expenses, fraud, exceptions] = await Promise.all([
    apiFetch<{ campaigns?: Campaign[] }>('/api/campaigns').catch(() => ({ campaigns: [] })),
    apiFetch<{ allocations?: Allocation[] }>('/api/allocations').catch(() => ({ allocations: [] })),
    apiFetch<{ expenses?: Array<{ status?: string; amountPaise?: number }> }>('/api/expenses').catch(() => ({ expenses: [] })),
    apiFetch<{ cases?: Array<{ severity?: string; isBlocking?: boolean }> }>('/api/fraud-cases').catch(() => ({ cases: [] })),
    apiFetch<{ exceptions?: unknown[] }>('/api/reconciliation/exceptions').catch(() => ({ exceptions: [] })),
  ])
  return { campaigns: campaigns.campaigns ?? [], allocations: allocations.allocations ?? [], expenses: expenses.expenses ?? [], fraud: fraud.cases ?? [], exceptions: exceptions.exceptions ?? [] }
}
const sum = (values: number[]) => values.reduce((total, value) => total + (Number.isSafeInteger(value) ? value : 0), 0)
function Kpi({ label, value, formula }: { label: string; value: number | string; formula: string }) {
  return <article className="relative border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-2"><p className="text-sm text-slate-500">{label}</p><span className="group relative"><Info size={15} className="text-slate-400" aria-label={`Formula: ${formula}`} /><span className="pointer-events-none absolute right-0 top-6 z-10 hidden w-64 border border-slate-300 bg-slate-900 p-3 text-xs leading-5 text-white group-hover:block group-focus-within:block">{formula}</span></span></div><p className="mt-3 text-xl font-semibold tabular-nums text-slate-900">{typeof value === 'number' ? <MoneyDisplay paise={value} /> : value}</p></article>
}
export function DashboardPage() {
  const query = useQuery({ queryKey: ['dashboard'], queryFn: loadDashboard })
  if (query.isLoading) return <div className="space-y-4"><LoadingSkeleton className="h-10 w-72" /><div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 10 }, (_, index) => <LoadingSkeleton key={index} className="h-28" />)}</div></div>
  if (query.isError) return <ErrorBanner message="Dashboard statistics could not be loaded. Please retry after the API is available." />
  const data = query.data ?? emptyData
  const allocated = sum(data.allocations.map((item) => item.approvedBudgetPaise))
  const reserved = sum(data.allocations.map((item) => item.reservedPaise))
  const paid = sum(data.allocations.map((item) => item.disbursedPaise))
  const available = sum(data.allocations.map((item) => item.approvedBudgetPaise - item.reservedPaise - item.disbursedPaise))
  const confirmed = sum(data.campaigns.map((item) => item.confirmedRaisedPaise ?? 0))
  const verifiedSpend = sum(data.campaigns.map((item) => item.verifiedSpendPaise ?? 0))
  const pending = sum(data.expenses.filter((item) => item.status === 'PENDING_APPROVALS').map((item) => item.amountPaise ?? 0))
  const frozen = data.allocations.filter((item) => item.status === 'FROZEN')
  const blocking = data.fraud.filter((item) => item.isBlocking).length
  const suspicious = data.fraud.filter((item) => !item.isBlocking).length
  const chartData = data.campaigns.map((item) => ({ name: (item.title ?? item.name ?? item.id).slice(0, 18), Donations: item.confirmedRaisedPaise ?? 0, Allocated: item.targetAmountPaise ?? 0, Paid: item.verifiedSpendPaise ?? 0, 'Verified spend': item.verifiedSpendPaise ?? 0 }))
  const purposeData = ['SCHOOL_FEES', 'BOOKS', 'UNIFORMS', 'SCIENCE_LAB_KITS', 'MIDDAY_NUTRITION'].map((purpose) => ({ purpose: purpose.replaceAll('_', ' '), amount: sum(data.allocations.filter((item) => item.purpose === purpose).map((item) => item.approvedBudgetPaise)) }))
  const formatTooltip = (value: unknown) => typeof value === 'number' ? `₹${(value / 100).toLocaleString('en-IN')}` : String(value ?? '')
  return <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Authenticated overview</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Financial control dashboard</h1><p className="mt-3 text-slate-600">All totals are derived from confirmed INR records. Simulated cross-chain events are excluded.</p><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Kpi label="Confirmed donations received" value={confirmed} formula="Sum of Campaign.confirmedRaisedPaise; confirmed provider payments only." /><Kpi label="Amount allocated" value={allocated} formula="Sum of Allocation.approvedBudgetPaise for purpose-bound allocations." /><Kpi label="Reserved for pending payouts" value={reserved} formula="Sum of Allocation.reservedPaise held for approved expenses awaiting transfer." /><Kpi label="Confirmed provider payouts" value={paid} formula="Sum of Allocation.disbursedPaise after settled provider transfers." /><Kpi label="Verified expenditure" value={verifiedSpend} formula="Sum of paid expenses represented by verified evidence." /><Kpi label="Available allocation balance" value={available} formula="approvedBudgetPaise - reservedPaise - disbursedPaise." /><Kpi label="Pending approvals" value={pending} formula="Sum of expense amounts in PENDING_APPROVALS." /><Kpi label="Frozen allocations & requests" value={`${frozen.length} · ₹${(sum(frozen.map((item) => item.approvedBudgetPaise)) / 100).toLocaleString('en-IN')}`} formula="Count and approved budget of allocations with status FROZEN." /><Kpi label="Open fraud-review cases" value={`${blocking} blocking · ${suspicious} suspicious`} formula="Open FraudCase records split by isBlocking." /><Kpi label="Reconciliation exceptions" value={String(data.exceptions.length)} formula="Open ambiguous or failed payout and webhook reconciliation records." /></div><div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_.9fr]"><section className="border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Financial pipeline by campaign</h2><div className="mt-5 h-80">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(value) => `₹${Math.round(value / 100).toLocaleString('en-IN')}`} tick={{ fontSize: 11 }} /><Tooltip formatter={formatTooltip} /><Legend /><Bar dataKey="Donations" fill="#1d4ed8" /><Bar dataKey="Allocated" fill="#64748b" /><Bar dataKey="Paid" fill="#0f766e" /><Bar dataKey="Verified spend" fill="#475569" /></BarChart></ResponsiveContainer> : <EmptyState title="No campaign data" description="Campaign statistics will appear once records are available." />}</div></section><section className="border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Purpose allocation breakdown</h2><div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={purposeData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" tickFormatter={(value) => `₹${Math.round(value / 100).toLocaleString('en-IN')}`} /><YAxis type="category" dataKey="purpose" width={105} tick={{ fontSize: 10 }} /><Tooltip formatter={formatTooltip} /><Bar dataKey="amount" fill="#1e3a8a" /></BarChart></ResponsiveContainer></div></section></div></div>
}
