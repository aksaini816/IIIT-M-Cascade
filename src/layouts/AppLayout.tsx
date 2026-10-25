import { AlertTriangle, BookOpenText, FileSearch, FolderLock, HandCoins, Home, Info, ListChecks, Menu, RefreshCcw } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useDemoStore } from '../hooks/useDemoStore'

const navItems = [
  { to: '/', label: 'Overview', icon: Home, end: true },
  { to: '/donations', label: 'Donations', icon: HandCoins },
  { to: '/fund-tracking', label: 'Fund Tracking', icon: ListChecks },
  { to: '/evidence-vault', label: 'Evidence Vault', icon: FolderLock },
  { to: '/fraud-detection', label: 'Fraud Detection', icon: AlertTriangle },
  { to: '/escrow-management', label: 'Escrow Management', icon: FileSearch },
  { to: '/audit-log', label: 'Audit Log', icon: BookOpenText },
  { to: '/project-information', label: 'Project Information', icon: Info },
]

const navClassName = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-cyan-500/15 text-cyan-200' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'}`

export const AppLayout = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { resetDemoData } = useDemoStore()

  const onReset = () => {
    if (window.confirm('Reset all demo interactions and restore seeded data?')) {
      resetDemoData()
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
      <button
        type="button"
        className="fixed left-4 top-4 z-40 rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100 lg:hidden"
        onClick={() => setIsOpen((value) => !value)}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-[#081933] p-6 transition lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wide text-cyan-300">TraceTrust</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Donation Transparency Console</h2>
        </div>

        <nav className="space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClassName} onClick={() => setIsOpen(false)}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={onReset}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/10"
        >
          <RefreshCcw className="h-4 w-4" />
          Reset Demo Data
        </button>

        <p className="mt-4 text-xs text-slate-400">All blockchain, fraud, and escrow interactions are simulated for demo purposes only.</p>
      </aside>

      {isOpen ? <div className="fixed inset-0 z-20 bg-slate-950/45 lg:hidden" onClick={() => setIsOpen(false)} aria-hidden="true" /> : null}

      <main className="flex-1 p-4 pt-16 lg:p-8 lg:pt-8">
        <Outlet />
      </main>
    </div>
  )
}
