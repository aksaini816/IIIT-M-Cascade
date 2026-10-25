import { useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { SectionHeader } from '../components/SectionHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useDemoStore } from '../hooks/useDemoStore'
import type { FraudAlert, FraudSeverity, FraudStatus } from '../types'
import { formatDateTime } from '../utils/format'

const severities: Array<'All' | FraudSeverity> = ['All', 'Low', 'Medium', 'High', 'Critical']
const statuses: Array<'All' | FraudStatus> = ['All', 'Open', 'Under Review', 'Resolved']

const simulatedAlerts: Omit<FraudAlert, 'id' | 'createdAt' | 'status'>[] = [
  { title: 'Duplicate Claim Burst', description: 'Three claims with same receipt hash across NGOs.', severity: 'High', relatedId: 'EV-2001' },
  { title: 'Unauthorized Category Mapping', description: 'Expense submitted for unsupported category in escrow.', severity: 'Medium', relatedId: 'AL-1002' },
  { title: 'Suspicious Transfer Loop', description: 'Repeated micro-transfers before evidence upload.', severity: 'Critical', relatedId: 'DON-2002' },
]

export const FraudDetectionPage = () => {
  const { state, createFraudAlert } = useDemoStore()
  const [severity, setSeverity] = useState<typeof severities[number]>('All')
  const [status, setStatus] = useState<typeof statuses[number]>('All')
  const [activeAlert, setActiveAlert] = useState<FraudAlert | null>(null)

  const filtered = useMemo(() => {
    return state.fraudAlerts.filter((alert) => (severity === 'All' || alert.severity === severity) && (status === 'All' || alert.status === status))
  }, [severity, status, state.fraudAlerts])

  const simulateAlert = () => {
    const random = simulatedAlerts[Math.floor(Math.random() * simulatedAlerts.length)]
    createFraudAlert(random)
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Fraud Detection" description="Monitor duplicate claims, category abuse, and suspicious transfer patterns." />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)}>
            {severities.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            {statuses.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700" onClick={simulateAlert}>
            Simulate Fraud Detection
          </button>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No alerts match your filters" body="Try changing severity or status filters." />
        ) : (
          <div className="space-y-3">
            {filtered.map((alert) => (
              <article key={alert.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{alert.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(alert.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={alert.severity} />
                    <StatusBadge value={alert.status} />
                  </div>
                </div>
                <button type="button" className="mt-3 text-sm font-medium text-cyan-700 hover:underline" onClick={() => setActiveAlert(alert)}>
                  Investigate
                </button>
              </article>
            ))}
          </div>
        )}
      </Card>

      {activeAlert ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Alert Investigation</h3>
            <p className="mt-2 text-sm text-slate-600">{activeAlert.description}</p>
            <p className="mt-3 text-sm text-slate-500">Related ID: {activeAlert.relatedId}</p>
            <p className="mt-2 text-sm text-slate-500">This is a frontend simulation and not connected to a production fraud engine.</p>
            <div className="mt-4 flex justify-end">
              <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white" onClick={() => setActiveAlert(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
