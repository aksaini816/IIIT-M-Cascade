import { useRef, useState } from 'react'
import { Download, FileUp, ShieldCheck } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { ErrorBanner } from '../../components/ui/States'
import { StatusBadge } from '../../components/ui/StatusBadge'

type Evidence = { id: string; sha256Hash: string; originalFilename: string; sizeBytes: number; verificationStatus?: string }
export function EvidenceUploader({ expenseId, existing = [] }: { expenseId: string; existing?: Evidence[] }) {
  const inputRef = useRef<HTMLInputElement>(null); const [files, setFiles] = useState(existing); const [error, setError] = useState(''); const [uploading, setUploading] = useState(false)
  const upload = async (file?: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Evidence files must be 5 MB or smaller.'); return }
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Only PDF, PNG, JPEG, and WebP evidence files are accepted.'); return }
    setError(''); setUploading(true)
    try {
      const response = await apiFetch<{ evidence: Evidence }>(`/api/evidence/${expenseId}/upload`, { method: 'POST', body: file, headers: { 'Content-Type': file.type, 'x-original-filename': file.name } })
      setFiles((current) => [...current, response.evidence])
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Evidence upload failed.') } finally { setUploading(false) }
  }
  const download = async (evidence: Evidence) => { const response = await fetch(`/api/evidence/${evidence.id}/download`, { credentials: 'include' }); if (!response.ok) { setError('You are not authorized to download this private evidence.'); return } const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = evidence.originalFilename; anchor.click(); URL.revokeObjectURL(url) }
  return <section className="border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-blue-700" /><h2 className="font-semibold text-slate-900">Private receipt evidence</h2></div><div className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Exact SHA-256 matching detects duplicate files, but does not independently prove invoice authenticity.</div><button type="button" className="mt-4 flex w-full flex-col items-center justify-center gap-2 border border-dashed border-slate-400 px-5 py-8 text-sm text-slate-600 hover:border-blue-700 hover:bg-blue-50" onClick={() => inputRef.current?.click()}><FileUp size={22} className="text-blue-700" />{uploading ? 'Uploading and hashing on server…' : 'Drop PDF, PNG, JPEG, or WebP here or choose a file'}<span className="text-xs text-slate-500">Maximum 5 MB · private organization-scoped storage</span></button><input ref={inputRef} className="hidden" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => void upload(event.target.files?.[0])} />{error && <div className="mt-4"><ErrorBanner message={error} /></div>}<div className="mt-4 space-y-3">{files.map((file) => <div key={file.id} className="border border-slate-200 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{file.originalFilename}</span><StatusBadge status={file.verificationStatus ?? 'PENDING'} /></div><p className="mt-2 font-mono text-xs break-all text-slate-500">SHA-256: {file.sha256Hash}</p><p className="mt-1 text-xs text-slate-500">{file.sizeBytes.toLocaleString('en-IN')} bytes</p><button className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700" onClick={() => void download(file)}><Download size={14} /> Secure download</button></div>)}</div></section>
}
