import { useState } from 'react';
import AdminLayout from './AdminLayout';
import OverviewPage from './pages/OverviewPage';
import UsersPage from './pages/UsersPage';
import MatchesPage from './pages/MatchesPage';
import PremiumPage from './pages/PremiumPage';
import ReportsPage from './pages/ReportsPage';

export type AdminPage = 'overview' | 'users' | 'matches' | 'premium' | 'reports';

export default function AdminApp() {
  const [page, setPage] = useState<AdminPage>('overview');

  // Permet à OverviewPage de naviguer vers reports via window.__adminNavigate
  (window as any).__adminNavigate = setPage;

  return (
    <AdminLayout currentPage={page} onNavigate={setPage} onLogout={() => window.location.href = '/'}>
      {page === 'overview' && <OverviewPage />}
      {page === 'users' && <UsersPage />}
      {page === 'matches' && <MatchesPage />}
      {page === 'premium' && <PremiumPage />}
      {page === 'reports' && <ReportsPage />}
    </AdminLayout>
  );
}
