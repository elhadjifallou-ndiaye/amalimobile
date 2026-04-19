import { useState } from 'react';
import AdminLayout from './AdminLayout';
import AdminLogin from './AdminLogin';
import OverviewPage from './pages/OverviewPage';
import UsersPage from './pages/UsersPage';
import MatchesPage from './pages/MatchesPage';
import PremiumPage from './pages/PremiumPage';
import ReportsPage from './pages/ReportsPage';

export type AdminPage = 'overview' | 'users' | 'matches' | 'premium' | 'reports';

export default function AdminApp() {
  const [page, setPage] = useState<AdminPage>('overview');
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('admin_auth') === '1');

  if (!isAdmin) {
    return <AdminLogin onSuccess={() => setIsAdmin(true)} />;
  }

  // Permet à OverviewPage de naviguer vers reports via window.__adminNavigate
  (window as any).__adminNavigate = setPage;

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    setIsAdmin(false);
  };

  return (
    <AdminLayout currentPage={page} onNavigate={setPage} onLogout={handleLogout}>
      {page === 'overview' && <OverviewPage />}
      {page === 'users' && <UsersPage />}
      {page === 'matches' && <MatchesPage />}
      {page === 'premium' && <PremiumPage />}
      {page === 'reports' && <ReportsPage />}
    </AdminLayout>
  );
}
