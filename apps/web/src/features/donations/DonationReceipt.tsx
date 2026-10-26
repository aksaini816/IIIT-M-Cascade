import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Circle, Clock3 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ErrorBanner, LoadingSkeleton } from '../../components/ui/States'

type Receipt = { status?: 'CONFIRMED' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'DISPUTED'; correlationId?: string; providerOrderId?: string; providerPaymentId?: string; createdAt?: string; campaignTitle?: string }
const stages = ['Allocation', 'Dual Approval', 'Payout', 'Impact Report']

export function DonationReceipt() {
  const { id = '' } = useParams()
  const query = useQuery<Receipt>({ queryKey: ['donation-receipt', id], queryFn: () => apiFetch<Receipt>(`/api/donations/${id}`).catch(() => ({ status: 'PENDING', correlationId: id, campaignTitle: 'Campaign funds' })) })
  if (query.isLoading || !query.data) return <div className="mx-auto max-w-3xl px-5 py-12"><LoadingSkeleton className="h-10 w-64" /><LoadingSkeleton className="mt-6 h-48 w-full" /></div>
  if (query.isError) return <div className="mx-auto max-w-3xl px-5 py-12"><ErrorBanner message="We could not load this receipt. Please retry using the correlation ID from your confirmation." /></div>
  const receipt = query.data
  const confirmed = receipt.status === 'CONFIRMED'
  return <div className="mx-auto max-w-3xl px-5 py-12"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Donation receipt</p><div className="mt-2 flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-semibold text-slate-900">Donation status</h1><StatusBadge status={receipt.status ?? 'PENDING'} /></div><div className={`mt-6 border p-4 text-sm ${confirmed ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>{confirmed ? 'CONFIRMED payments count toward campaign funds.' : 'Only CONFIRMED payments count toward campaign funds. This payment has not reached confirmed status.'}</div><section className="mt-6 border border-slate-200 bg-white p-6"><h2 className="font-semibold text-slate-900">{receipt.campaignTitle ?? 'Campaign funds'}</h2><dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2"><Detail label="Correlation ID" value={receipt.correlationId ?? id} mono /><Detail label="Provider order ID" value={receipt.providerOrderId ?? 'Pending'} mono /><Detail label="Provider payment ID" value={receipt.providerPaymentId ?? 'Pending'} mono /><Detail label="Created" value={receipt.createdAt ? new Date(receipt.createdAt).toLocaleString('en-IN') : 'Pending'} /></dl></section><section className="mt-6 border border-slate-200 bg-white p-6"><h2 className="font-semibold text-slate-900">Impact tracker</h2><div className="mt-6 grid gap-0 sm:grid-cols-4">{stages.map((stage, index) => <div key={stage} className="relative flex gap-3 pb-6 last:pb-0 sm:block sm:pb-0 sm:text-center"><div className={`relative z-10 mx-0 flex h-9 w-9 items-center justify-center rounded-full border sm:mx-auto ${confirmed && index === 0 ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-400'}`}>{confirmed && index === 0 ? <CheckCircle2 size={18} /> : index === 0 ? <Clock3 size={18} /> : <Circle size={18} />}</div><p className="pt-2 text-sm font-medium text-slate-700">{stage}</p></div>)}</div><p className="mt-5 text-xs text-slate-500">Progress updates only when the corresponding server-side financial or impact record is verified.</p></section><Link to="/campaigns" className="mt-6 inline-block text-sm font-semibold text-blue-700">Return to campaigns</Link></div>
}
function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><dt className="text-slate-500">{label}</dt><dd className={`mt-1 break-all font-medium text-slate-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd></div> }
