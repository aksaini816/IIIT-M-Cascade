import { Card } from '../components/Card'
import { SectionHeader } from '../components/SectionHeader'

export const ProjectInformationPage = () => (
  <div className="space-y-6">
    <SectionHeader title="Project Information" description="TraceTrust MVP scope and architecture overview." />

    <Card>
      <h3 className="text-lg font-semibold text-slate-900">Problem Statement</h3>
      <p className="mt-2 text-sm text-slate-600">
        TraceTrust improves transparency in donations for underprivileged children by making the flow from donation to verified expenditure auditable and easy to understand.
      </p>
    </Card>

    <Card>
      <h3 className="text-lg font-semibold text-slate-900">Proposed Architecture</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>React + TypeScript frontend for dashboard workflows</li>
        <li>Planned Solidity escrow layer for enforceable release controls</li>
        <li>Planned cross-chain indexing pipeline for movement traceability</li>
        <li>Planned evidence verification and fraud scoring services</li>
      </ul>
    </Card>

    <Card>
      <h3 className="text-lg font-semibold text-slate-900">Technology Stack</h3>
      <p className="mt-2 text-sm text-slate-600">React, TypeScript, Vite, Tailwind CSS, React Router, Lucide React, Recharts, and localStorage for demo state persistence.</p>
    </Card>

    <Card>
      <h3 className="text-lg font-semibold text-slate-900">Current Implementation Status</h3>
      <p className="mt-2 text-sm text-slate-600">Frontend-only MVP with seeded data, interactive workflows, and no backend, payment gateway, authentication, or blockchain deployment.</p>
    </Card>

    <Card>
      <h3 className="text-lg font-semibold text-slate-900">Planned Features</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>Solidity escrow contracts with governed release policies</li>
        <li>Cross-chain indexing and reconciliation</li>
        <li>Cryptographic evidence verification pipelines</li>
        <li>Privacy-preserving proofs for selective disclosure</li>
      </ul>
    </Card>
  </div>
)
