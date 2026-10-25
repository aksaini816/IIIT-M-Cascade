import { useState } from 'react'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { SectionHeader } from '../components/SectionHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useDemoStore } from '../hooks/useDemoStore'
import { formatCurrency, formatDateTime } from '../utils/format'

export const EvidenceVaultPage = () => {
  const { state, runDuplicateCheck } = useDemoStore()
  const [input, setInput] = useState('')
  const [resultCount, setResultCount] = useState<number | null>(null)

  const onCheck = () => {
    const matches = runDuplicateCheck(input)
    setResultCount(matches.length)
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Evidence Vault" description="Demo expense evidence records with frontend-only duplicate checks." />

      <Card>
        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Enter evidence ID or hash (e.g., EV-1012 or 0xdup2001)"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700" onClick={onCheck}>
            Check Duplicate
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Actual cryptographic/authenticity verification is not integrated in this frontend MVP.</p>
        {resultCount !== null ? (
          <p className={`mt-3 text-sm ${resultCount > 1 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {resultCount > 1 ? `Potential duplicate detected (${resultCount} matching entries).` : 'No duplicate conflict found in current demo state.'}
          </p>
        ) : null}
      </Card>

      <Card>
        {state.evidenceRecords.length === 0 ? (
          <EmptyState title="No evidence records" body="Demo evidence submissions will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Evidence ID</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Hash</th>
                  <th className="py-2">Receipt Preview</th>
                  <th className="py-2">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {state.evidenceRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 font-medium text-slate-900">{record.id}</td>
                    <td className="py-3">{record.category}</td>
                    <td className="py-3">{formatCurrency(record.amountInr)}</td>
                    <td className="py-3"><StatusBadge value={record.status} /></td>
                    <td className="py-3 font-mono text-xs text-slate-600">{record.evidenceHash}</td>
                    <td className="py-3 text-slate-600">{record.receiptPreview}</td>
                    <td className="py-3 text-slate-500">{formatDateTime(record.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
