import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rupeesToPaise } from '@kindora/shared'
import { apiFetch } from '../../lib/api'
import { MoneyDisplay } from '../../components/ui/MoneyDisplay'
import { ErrorBanner } from '../../components/ui/States'

type CheckoutOrder = { donation?: { id: string; correlationId?: string }; checkout?: { orderId: string; checkoutUrl?: string; provider?: string } }

const presets = [500, 2500, 10000, 25000]
const provider = (import.meta.env.VITE_PAYMENT_PROVIDER ?? 'sandbox').toUpperCase()

export function DonationCheckout({ campaignId, campaignTitle, onClose }: { campaignId: string; campaignTitle: string; onClose: () => void }) {
  const [amount, setAmount] = useState('2500')
  const [anonymous, setAnonymous] = useState(false)
  const [order, setOrder] = useState<CheckoutOrder | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [simulatorOpen, setSimulatorOpen] = useState(false)
  const navigate = useNavigate()
  const amountPaise = (() => { try { return rupeesToPaise(amount) } catch { return 0 } })()
  const createOrder = async () => {
    setError('')
    if (!amountPaise) { setError('Enter a valid positive INR amount with up to two decimal places.'); return }
    setBusy(true)
    try {
      const result = await apiFetch<CheckoutOrder>('/api/donations/orders', { method: 'POST', body: JSON.stringify({ campaignId, amountPaise, currency: 'INR', isAnonymous: anonymous, idempotencyKey: `web-${crypto.randomUUID()}` }) })
      setOrder(result)
      if (result.checkout?.checkoutUrl) window.location.assign(result.checkout.checkoutUrl)
      else if ((result.checkout?.provider ?? provider).toLowerCase() === 'sandbox') setSimulatorOpen(true)
      else setError('The provider order was created, but no checkout URL was returned.')
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to create the donation order.') } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-4"><div className="mx-auto mt-8 max-w-xl border border-slate-200 bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Donate in INR</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{campaignTitle}</h2></div><button className="text-slate-500" onClick={onClose} aria-label="Close donation checkout">×</button></div><div className="mt-5 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">INR ONLY — Running in Test/Sandbox Mode (<strong>{provider}</strong>). Real bank charges are disabled until live compliance activation.</div><div className="mt-6"><p className="text-sm font-medium text-slate-900">Choose an amount</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{presets.map((preset) => <button key={preset} type="button" className={`border px-3 py-2 text-sm font-medium ${amount === String(preset) ? 'border-blue-700 bg-blue-50 text-blue-800' : 'border-slate-300'}`} onClick={() => setAmount(String(preset))}>₹{preset.toLocaleString('en-IN')}</button>)}</div><label className="mt-4 block text-sm font-medium text-slate-900">Custom amount (INR)<input inputMode="decimal" className="mt-1 w-full border border-slate-300 px-3 py-2 text-lg tabular-nums" value={amount} onChange={(event) => setAmount(event.target.value)} aria-describedby="amount-help" /><span id="amount-help" className="mt-1 block text-xs text-slate-500">{amountPaise ? <><MoneyDisplay paise={amountPaise} /> exact integer paise will be sent to the server.</> : 'Use a positive amount, for example 1250.50.'}</span></label></div><label className="mt-5 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} /> Donate anonymously</label>{error && <div className="mt-5"><ErrorBanner message={error} /></div>}<div className="mt-6 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-slate-500">Order amount: <MoneyDisplay paise={amountPaise} className="font-semibold text-slate-900" /></span><button disabled={busy} className="rounded-md bg-slate-900 px-5 py-3 font-medium text-white disabled:opacity-50" onClick={createOrder}>{busy ? 'Creating order…' : 'Continue to payment'}</button></div>{order && <p className="mt-4 font-mono text-xs text-slate-500">Provider order: {order.checkout?.orderId ?? 'created'}</p>}</div>{simulatorOpen && order?.checkout?.orderId && <TestPaymentSimulator orderId={order.checkout.orderId} donationId={order.donation?.id} onClose={() => setSimulatorOpen(false)} onReceipt={(id) => navigate(`/donations/${id}/receipt`)} />}</div>
}

function TestPaymentSimulator({ orderId, donationId, onClose, onReceipt }: { orderId: string; donationId?: string; onClose: () => void; onReceipt: (id: string) => void }) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const simulate = async (outcome: 'success' | 'failure' | 'duplicate') => {
    setBusy(true); setStatus('')
    try {
      const paymentId = `sandbox_payment_${outcome === 'failure' ? 'fail' : 'success'}_${crypto.randomUUID()}`
      const secret = import.meta.env.VITE_SANDBOX_PAYMENT_SECRET
      if (!secret) throw new Error('Sandbox simulator signing is disabled. Set VITE_SANDBOX_PAYMENT_SECRET only in a local test environment.')
      const signature = await sign(`${orderId}|${paymentId}`, secret)
      if (outcome === 'failure') throw new Error('The simulator produced a signed failure. No confirmed donation was created.')
      await apiFetch('/api/donations/verify-callback', { method: 'POST', body: JSON.stringify({ orderId, paymentId, signature }) })
      setStatus(outcome === 'duplicate' ? 'The callback can now be replayed with the same event ID to test webhook idempotency.' : 'Verified payment callback accepted.')
      if (donationId) onReceipt(donationId)
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Simulator request failed.') } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md border border-slate-200 bg-white p-6"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Local sandbox</p><h3 className="mt-1 text-xl font-semibold text-slate-900">Test payment simulator</h3><p className="mt-2 text-sm text-slate-600">These controls use the configured server-compatible HMAC secret. They never represent a live bank payment.</p><div className="mt-5 grid gap-2"><button disabled={busy} className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-left text-sm text-emerald-900" onClick={() => simulate('success')}>Verified payment success</button><button disabled={busy} className="border border-red-300 bg-red-50 px-3 py-2 text-left text-sm text-red-900" onClick={() => simulate('failure')}>Payment failure</button><button disabled={busy} className="border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900" onClick={() => simulate('duplicate')}>Duplicate webhook delivery test</button></div>{status && <p className="mt-4 border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{status}</p>}<button className="mt-5 text-sm font-medium text-slate-600 underline" onClick={onClose}>Close simulator</button></div></div>
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
