import type { LucideIcon } from 'lucide-react'
import { Card } from './Card'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  helper?: string
}

export const StatCard = ({ icon: Icon, label, value, helper }: StatCardProps) => (
  <Card className="min-h-[126px]">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
      </div>
      <Icon className="h-5 w-5 text-cyan-600" />
    </div>
  </Card>
)
