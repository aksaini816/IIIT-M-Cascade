interface StatusBadgeProps {
  value: string
}

const colorMap: Record<string, string> = {
  Received: 'bg-blue-100 text-blue-700',
  Allocated: 'bg-cyan-100 text-cyan-700',
  Verified: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Flagged: 'bg-rose-100 text-rose-700',
  Duplicate: 'bg-rose-100 text-rose-700',
  Open: 'bg-rose-100 text-rose-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Frozen: 'bg-slate-200 text-slate-700',
  Funded: 'bg-emerald-100 text-emerald-700',
  'Pending Verification': 'bg-amber-100 text-amber-700',
  'Eligible for Release': 'bg-blue-100 text-blue-700',
  Low: 'bg-blue-100 text-blue-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-rose-100 text-rose-700',
  Completed: 'bg-emerald-100 text-emerald-700',
}

export const StatusBadge = ({ value }: StatusBadgeProps) => (
  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colorMap[value] ?? 'bg-slate-100 text-slate-700'}`}>{value}</span>
)
