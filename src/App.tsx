import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { AuditLogPage } from './pages/AuditLogPage'
import { DonationsPage } from './pages/DonationsPage'
import { EscrowManagementPage } from './pages/EscrowManagementPage'
import { EvidenceVaultPage } from './pages/EvidenceVaultPage'
import { FraudDetectionPage } from './pages/FraudDetectionPage'
import { FundTrackingPage } from './pages/FundTrackingPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OverviewPage } from './pages/OverviewPage'
import { ProjectInformationPage } from './pages/ProjectInformationPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'donations', element: <DonationsPage /> },
      { path: 'fund-tracking', element: <FundTrackingPage /> },
      { path: 'evidence-vault', element: <EvidenceVaultPage /> },
      { path: 'fraud-detection', element: <FraudDetectionPage /> },
      { path: 'escrow-management', element: <EscrowManagementPage /> },
      { path: 'audit-log', element: <AuditLogPage /> },
      { path: 'project-information', element: <ProjectInformationPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

const App = () => <RouterProvider router={router} />

export default App
