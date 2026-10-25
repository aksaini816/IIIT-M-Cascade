import { useState } from 'react'
import { Card } from '../components/Card'
import { SectionHeader } from '../components/SectionHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useDemoStore } from '../hooks/useDemoStore'
import { formatCurrency } from '../utils/format'

export const EscrowManagementPage = () => {
  const { state, toggleFreezeAllocation, attemptRelease } = useDemoStore()
  const [releaseAmount, setReleaseAmount] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')

  const submitRelease = (event: React.FormEvent<HTMLFormElement>, allocationId: string) => {
    event.preventDefault()
    const amount = Number(releaseAmount[allocationId] ?? 0)
    const result = attemptRelease(allocationId, amount)
    setMessage(result.message)
    if (result.success) {
      setReleaseAmount((prev) => ({ ...prev, [allocationId]: '' }))
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Escrow Management" description="Frontend-only controls for freeze/unfreeze and simulated release attempts." />
      <Card>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          These controls only update local demo state. No smart-contract enforcement is active in this MVP.
        </p>
        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </Card>
      <div className="space-y-4">
        {state.allocations.map((allocation) => {
          const remaining = allocation.amountInr - allocation.releasedInr
          return (
            <Card key={allocation.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{allocation.id}</p>
                  <p className="text-sm text-slate-600">{allocation.purpose}</p>
                </div>
                <StatusBadge value={allocation.status} />
              </div>

              <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                <p>Allocation Amount: <span className="font-medium text-slate-900">{formatCurrency(allocation.amountInr)}</span></p>
                <p>Released Amount: <span className="font-medium text-slate-900">{formatCurrency(allocation.releasedInr)}</span></p>
                <p>Remaining Balance: <span className="font-medium text-slate-900">{formatCurrency(remaining)}</span></p>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  onClick={() => {
                    const action = allocation.isFrozen ? 'unfreeze' : 'freeze'
                    if (window.confirm(`Confirm ${action} action for ${allocation.id}?`)) {
                      toggleFreezeAllocation(allocation.id)
                    }
                  }}
                >
                  {allocation.isFrozen ? 'Unfreeze Allocation' : 'Freeze Allocation'}
                </button>

                <form className="flex items-center gap-2" onSubmit={(event) => submitRelease(event, allocation.id)}>
                  <input
                    type="number"
                    min="1"
                    placeholder="Release amount"
                    value={releaseAmount[allocation.id] ?? ''}
                    onChange={(event) => setReleaseAmount((prev) => ({ ...prev, [allocation.id]: event.target.value }))}
                    className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
                    Simulate Release
                  </button>
                </form>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
