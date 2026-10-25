import { Card } from '../components/Card'
import { SectionHeader } from '../components/SectionHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useDemoStore } from '../hooks/useDemoStore'
import { formatDateTime } from '../utils/format'

export const FundTrackingPage = () => {
  const { state } = useDemoStore()

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Fund Tracking"
        description="Timeline from donation to evidence verification, including simulated swap, bridge, and fiat off-ramp events."
      />

      <Card>
        <p className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
          DEMO DATA: All blockchain events shown below (including the 50 ETH donation) are simulated for frontend demonstration only.
        </p>
        <ol className="mt-4 space-y-4">
          {state.fundEvents.map((event) => (
            <li key={event.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">
                  {event.type} <span className="text-slate-500">· {event.donationId}</span>
                </p>
                <div className="flex items-center gap-2">
                  {event.isDemoChainEvent ? <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-800">DEMO DATA</span> : null}
                  <StatusBadge value={event.status} />
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-600">{event.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                Amount: <span className="font-medium text-slate-700">{event.amountLabel}</span> · Timestamp: {formatDateTime(event.timestamp)}
              </p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
