import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Clipboard, ShieldAlert } from 'lucide-react'
import { useTraceTrust } from '../context/TraceTrustContext'
import type { PurposeCategory } from '../types/tracetrust'

const categories: Array<PurposeCategory | 'Administrative/Unbound'> = ['School Fees', 'Books & Curriculum', 'Uniforms & Footwear', 'Stationery & Lab Kits', 'Administrative/Unbound']
const inr = (value: number) => `₹${value.toLocaleString('en-IN')}`
const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain', 'application/json']
const shortHash = (hash: string) => `${hash.slice(0, 12)}…${hash.slice(-10)}`

export function EvidenceVaultPage() {
  const { donations, allocations, claims, evidence, evidenceRegistry, submitEvidenceClaim } = useTraceTrust()
  const [donationId, setDonationId] = useState(donations[0]?.id ?? '')
  const [category, setCategory] = useState<PurposeCategory | 'Administrative/Unbound'>('Books & Curriculum')
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('VND-NCERT-DIST-01')
  const [description, setDescription] = useState('')
  const [cohort, setCohort] = useState('BEN-COHORT-2026-A')
  const [file, setFile] = useState<File | null>(null)
  const [hash, setHash] = useState('')
  const [hashing, setHashing] = useState(false)
  const [message, setMessage] = useState('')
  const selectedAllocation = allocations.find((item) => item.donationId === donationId)
  const selectedDonation = donations.find((item) => item.id === donationId)
  const registryRows = evidence.map((item) => ({ ...item, claim: claims.find((claim) => claim.id === item.claimId), donation: donations.find((donation) => allocations.find((allocation) => allocation.id === claims.find((claim) => claim.id === item.claimId)?.allocationId)?.donationId === donation.id) })).filter((row) => row.claim)
  const calculate = async (nextFile: File | null) => {
    setFile(nextFile); setHash('')
    if (!nextFile) return
    if (!allowed.includes(nextFile.type) && !/\.(pdf|png|jpe?g|txt|json)$/i.test(nextFile.name)) return setMessage('Unsupported file type. Use PDF, PNG, JPG, TXT, or JSON.')
    if (nextFile.size > 5 * 1024 * 1024) return setMessage('File exceeds the 5MB evidence limit.')
    setHashing(true); setMessage('')
    try { const digest = await window.crypto.subtle.digest('SHA-256', await nextFile.arrayBuffer()); setHash(Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')) } catch { setMessage('SHA-256 calculation failed; the claim was not submitted.') } finally { setHashing(false) }
  }
  const sample = async (kind: 'valid' | 'duplicate' | 'forged') => {
    const existing = Object.keys(evidenceRegistry)[0]
    const content = kind === 'duplicate' && existing ? 'duplicate' : kind === 'forged' ? 'FORGED-FIXTURE-USER-01 | issuer registry mismatch' : `Valid Receipt Sample | ${new Date().toISOString()}`
    const sampleFile = new File([content], kind === 'forged' ? 'FORGED-FIXTURE-USER-01.txt' : `${kind}-receipt-sample.txt`, { type: 'text/plain' })
    await calculate(sampleFile)
    if (kind === 'duplicate' && existing) setHash(existing)
    if (kind === 'forged') setVendor('VND-FORGED-UNVERIFIED')
  }
  useEffect(() => { if (!donationId && donations[0]) setDonationId(donations[0].id) }, [donationId, donations])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedDonation || !selectedAllocation) return setMessage('Select a donation with an active allocation.')
    if (!Number(amount) || Number(amount) <= 0) return setMessage('Expense amount must be greater than zero.')
    if (category === 'Administrative/Unbound') return setMessage('Administrative/Unbound expenses cannot be released from a purpose-bound education allocation.')
    const result = submitEvidenceClaim({ donationId, purpose: category, amount: Number(amount), vendorId: vendor, file, sha256: hash, description, beneficiaryCohortId: cohort, issuerVerified: !vendor.includes('FORGED') && !vendor.includes('UNVERIFIED') })
    setMessage(`${result.claimId}: ${result.status}. ${result.message}`)
  }
  const copy = async (value: string) => navigator.clipboard?.writeText(value)
  return <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Evidence integrity registry</p><h2 className="mt-1 text-2xl font-semibold">Evidence Vault</h2></div>
    <div className="border border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-950"><div className="flex gap-3"><ShieldAlert className="mt-0.5 shrink-0" size={19} /><p><strong>CRYPTOGRAPHIC INTEGRITY NOTICE:</strong> Calculating a SHA-256 digest proves file byte-consistency and prevents the same digital file from being reused across multiple claims. However, SHA-256 alone does NOT prove that an invoice is genuine or that goods were delivered. Production verification requires independent vendor signature validation, GSTIN/tax invoice registry checks, and physical delivery audit.</p></div></div>
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]"><form onSubmit={submit} className="border border-stone-200 bg-white p-5"><h3 className="font-semibold">Submit expense evidence</h3><div className="mt-4 space-y-4"><label className="block text-sm font-medium">Target donation<select value={donationId} onChange={(e) => setDonationId(e.target.value)} className="mt-1 w-full border border-stone-300 bg-white px-3 py-2 text-sm">{donations.map((donation) => <option key={donation.id} value={donation.id}>{donation.id} · {donation.purpose}</option>)}</select></label>{selectedAllocation && <div className="border border-stone-200 bg-stone-50 p-3 text-xs"><p>Allowed purpose: <strong>{selectedAllocation.purpose}</strong></p><p className="mt-1">Remaining eligible balance: <strong className="tabular-nums">{inr(Math.max(0, selectedAllocation.allocatedAmount - selectedAllocation.spentAmount))}</strong></p></div>}<label className="block text-sm font-medium">Expense category<select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="mt-1 w-full border border-stone-300 bg-white px-3 py-2 text-sm">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block text-sm font-medium">Expense amount (INR)<input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full border border-stone-300 px-3 py-2 tabular-nums" /></label><label className="block text-sm font-medium">Vendor identifier<input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="VND-NCERT-DIST-01" className="mt-1 w-full border border-stone-300 px-3 py-2 font-mono text-xs" /></label><div><p className="text-sm font-medium">Quick-attach sample test file</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => sample('valid')} className="border border-stone-300 px-2 py-1 text-xs">Valid receipt</button><button type="button" onClick={() => sample('duplicate')} className="border border-amber-300 bg-amber-50 px-2 py-1 text-xs">Duplicate receipt</button><button type="button" onClick={() => sample('forged')} className="border border-red-300 bg-red-50 px-2 py-1 text-xs">Forged fixture</button></div></div><label className="block text-sm font-medium">Invoice / receipt file<input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.json" onChange={(e: ChangeEvent<HTMLInputElement>) => void calculate(e.target.files?.[0] ?? null)} className="mt-1 block w-full border border-stone-300 px-2 py-2 text-xs" /></label>{file && <div className="border border-stone-300 bg-stone-50 p-3 font-mono text-xs"><p className="break-all">SHA-256: {hashing ? 'Calculating…' : hash}</p><p className="mt-1">File: {file.name} · {(file.size / 1024).toFixed(1)} KB · {file.type || 'unknown MIME'}</p></div>}<label className="block text-sm font-medium">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" /></label><label className="block text-sm font-medium">Anonymized beneficiary cohort ID<input value={cohort} onChange={(e) => setCohort(e.target.value)} className="mt-1 w-full border border-stone-300 px-3 py-2 font-mono text-xs" /></label>{message && <p className="border border-stone-300 bg-stone-50 p-3 text-xs leading-5">{message}</p>}<button disabled={hashing} className="w-full bg-[#1B4332] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Register and evaluate claim</button></div></form>
      <section className="min-w-0 border border-stone-200 bg-white"><div className="border-b border-stone-200 p-5"><h3 className="font-semibold">Global evidence hash registry</h3><p className="mt-1 text-xs text-stone-500">{Object.keys(evidenceRegistry).length} registered digest(s) across all donations.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-stone-200 bg-stone-50 text-[10px] uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-3">SHA-256 digest</th><th className="px-5 py-3">File</th><th className="px-5 py-3">Claim / donation</th><th className="px-5 py-3">Vendor / issuer</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{registryRows.map((row) => <tr key={row.id} className="border-b border-stone-100 align-top last:border-0"><td className="px-5 py-4"><button title="Copy SHA-256 digest" onClick={() => void copy(row.sha256)} className="flex items-center gap-2 font-mono text-xs text-[#1B4332]"><Clipboard size={13} />{shortHash(row.sha256)}</button></td><td className="px-5 py-4 text-xs">{row.fileName}<p className="mt-1 text-stone-500">{row.claim ? `${(row.fileName.length * 31)} bytes recorded` : ''}</p></td><td className="px-5 py-4 font-mono text-xs">{row.claim?.id}<p className="mt-1 text-stone-500">{row.donation?.id ?? '—'}</p></td><td className="px-5 py-4 text-xs">{row.claim?.vendorName}<p className="mt-1">{row.claim?.issuerSignatureVerified ? <span className="text-emerald-800">Verified issuer</span> : <span className="text-red-800">Mismatch</span>}</p></td><td className="px-5 py-4"><span className="border border-stone-300 bg-stone-50 px-2 py-1 text-[10px]">{row.claim?.verificationStatus}</span></td></tr>)}</tbody></table></div></section></div></div>
}
