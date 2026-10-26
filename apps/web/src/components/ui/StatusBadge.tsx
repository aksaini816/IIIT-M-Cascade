import { cn } from '../../lib/cn'

const toneByState: Record<string, string> = {
  VERIFIED: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  RELEASED: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  PENDING_APPROVALS: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  FUNDED: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  FROZEN: 'border-slate-900 bg-slate-900 text-red-200 dark:border-red-800 dark:bg-slate-950 dark:text-red-300',
  REJECTED: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300',
  FLAGGED: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300',
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = status.replaceAll('_', ' ')
  return <span className={cn('inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide', toneByState[status] ?? 'border-slate-300 bg-slate-50 text-slate-700', className)}>{label}</span>
}
