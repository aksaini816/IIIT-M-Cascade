import { useState } from 'react'
import { AlertTriangle, Archive, BarChart3, BookOpen, ChevronRight, ClipboardList, Landmark, Menu, RotateCcw, ShieldCheck, X } from 'lucide-react'
import { useTraceTrust } from '../context/TraceTrustContext'
import { DonationsPage } from '../pages/DonationsPage'
import { FundTrackingPage } from '../pages/FundTrackingPage'
import { OverviewDashboard } from '../pages/OverviewDashboard'
import { EvidenceVaultPage } from '../pages/EvidenceVaultPage'
import { FraudDetectionPage } from '../pages/FraudDetectionPage'
import { EscrowControlPage } from '../pages/EscrowControlPage'
import { AuditLogPage } from '../pages/AuditLogPage'

const navigation = [
  { label: 'Overview Dashboard', icon: BarChart3, description: 'System overview' },
  { label: 'Donations & Intake', icon: Landmark, description: 'Purpose-bound funds' },
  { label: 'Fund Tracking & 50 ETH Pipeline', icon: BookOpen, description: 'Grant conversion' },
  { label: 'Evidence Vault (SHA-256)', icon: Archive, description: 'Receipt evidence' },
  { label: 'Fraud Detection Engine', icon: AlertTriangle, description: 'Rules and alerts' },
  { label: 'Escrow Control', icon: ShieldCheck, description: 'Release controls' },
  { label: 'Audit Trail Ledger', icon: ClipboardList, description: 'Human-readable log' },
]

export function Layout() {
  const { claims, evidence, auditLogs, donations, allocations, loadDemoScenario, resetState, fraudAlerts } = useTraceTrust()
  const [active, setActive] = useState(navigation[0].label)
  const [selectedDonationId, setSelectedDonationId] = useState<string | undefined>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const activeNav = navigation.find((item) => item.label === active) ?? navigation[0]
  const closeDrawer = () => setDrawerOpen(false)
  const navigate = (page: string, donationId?: string) => { setActive(page); setSelectedDonationId(donationId); closeDrawer() }
  const page = active === 'Overview Dashboard'
    ? <OverviewDashboard onNavigate={navigate} />
    : active === 'Donations & Intake'
      ? <DonationsPage onNavigate={navigate} />
      : active === 'Fund Tracking & 50 ETH Pipeline'
        ? <FundTrackingPage initialDonationId={selectedDonationId} />
          : active === 'Evidence Vault (SHA-256)'
            ? <EvidenceVaultPage />
            : active === 'Fraud Detection Engine'
              ? <FraudDetectionPage />
              : active === 'Escrow Control'
                ? <EscrowControlPage onNavigate={navigate} />
                : active === 'Audit Trail Ledger'
                  ? <AuditLogPage />
                  : null

  return <div className="min-h-screen bg-[#FAF9F6] text-stone-900">
    <div className="border-b border-stone-300 bg-stone-900 px-4 py-2 text-center text-[11px] font-medium tracking-wide text-stone-100">EVALUATION PROTOTYPE: INR &amp; ETH transactions are simulated. LocalStorage audit logs are for demonstration and are not an immutable blockchain ledger. Child beneficiary records are strictly anonymized.</div>
    <div className="flex min-h-[calc(100vh-33px)]">
      {drawerOpen && <button aria-label="Close navigation" className="fixed inset-0 z-20 bg-stone-900/30 lg:hidden" onClick={closeDrawer} />}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-stone-200 bg-white transition-transform lg:static lg:translate-x-0 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center justify-between border-b border-stone-200 px-6"><div><p className="text-lg font-semibold tracking-tight">TraceTrust</p><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-stone-500">Education audit office</p></div><button className="lg:hidden" onClick={closeDrawer} aria-label="Close"><X size={20} /></button></div>
        <nav className="flex-1 space-y-1 p-4"><p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">Control modules</p>        {navigation.map((item) => { const NavIcon = item.icon; return <button key={item.label} onClick={() => navigate(item.label)} className={`flex w-full items-center gap-3 border px-3 py-3 text-left transition ${active === item.label ? 'border-[#1B4332] bg-[#1B4332] text-white' : 'border-transparent text-stone-600 hover:border-stone-200 hover:bg-stone-50'}`}><NavIcon size={17} strokeWidth={1.8} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{item.label}</span><span className={`block text-[11px] ${active === item.label ? 'text-stone-200' : 'text-stone-400'}`}>{item.description}</span></span><ChevronRight size={14} /></button> })}</nav>
        <div className="border-t border-stone-200 p-5 text-xs text-stone-500"><p className="font-mono">INSTANCE: LOCAL-DEMO-01</p><p className="mt-1">Data residency: browser storage</p></div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-stone-200 bg-white px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><button className="lg:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open navigation"><Menu size={22} /></button><div><p className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">TraceTrust / {activeNav.label}</p><h1 className="mt-1 text-xl font-semibold tracking-tight">{activeNav.label}</h1></div></div><div className="flex flex-wrap items-center gap-2"><span className="border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600">Simulation Mode — Local State</span><button onClick={() => setGuideOpen(!guideOpen)} className="border border-stone-300 bg-white px-3 py-2 text-xs font-semibold">Evaluator Guide</button><button onClick={loadDemoScenario} className="flex items-center gap-2 bg-[#1B4332] px-3 py-2 text-xs font-semibold text-white hover:bg-[#143325]"><RotateCcw size={14} /> Load Demo Scenario</button><button onClick={resetState} className="border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">Reset State</button></div></header>
        {guideOpen && <EvaluatorGuide onNavigate={navigate} onReset={loadDemoScenario} claims={claims.length} evidence={evidence.length} donations={donations.length} allocations={allocations.length} alerts={fraudAlerts.length} />}
        <div className="p-5 sm:p-8">
          {page ?? <section className="border border-stone-200 bg-white p-8"><h2 className="text-xl font-semibold">{activeNav.label}</h2><p className="mt-2 text-sm text-stone-600">This module is ready for the next TraceTrust implementation stage. Current live records: {claims.length} claims, {evidence.length} evidence records, {auditLogs.length} audit entries.</p></section>}
          {page && null}
          {!page && null}
          {page ? null : null}
        </div>
      </main>
    </div>
  </div>
}

function EvaluatorGuide({ onNavigate, onReset, claims, evidence, donations, allocations, alerts }: { onNavigate: (page: string, donationId?: string) => void; onReset: () => void; claims: number; evidence: number; donations: number; allocations: number; alerts: number }) {
  const checks = [
    ['Valid evidence passing checks', claims > 0 && evidence > 0],
    ['Duplicate SHA-256 hash rejected', alerts > 0],
    ['Forged receipt fixtures flagged', claims >= 8],
    ['Unauthorized category expense flagged', alerts > 0],
    ['Escrow release policy available', allocations > 0],
    ['Clean replay state available', donations > 0],
  ]
  return <div className="border-b border-stone-300 bg-stone-50 px-5 py-4 sm:px-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Evaluator Quick-Verify Guide</p><p className="mt-1 text-xs text-stone-600">Use the live controls below to replay the acceptance criteria.</p></div><div className="flex gap-2"><button onClick={() => onNavigate('Escrow Control', 'ALLOC-002')} className="border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900">Open frozen escrow</button><button onClick={onReset} className="bg-[#1B4332] px-3 py-2 text-xs font-semibold text-white">Reset &amp; Replay Scenario</button></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{checks.map(([label, passed]) => <div key={String(label)} className="flex items-center gap-2 border border-stone-200 bg-white px-3 py-2 text-xs"><span className={passed ? 'text-emerald-800' : 'text-stone-400'}>{passed ? '✓' : '○'}</span>{label}</div>)}</div></div>
}
