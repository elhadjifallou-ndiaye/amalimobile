import { ReactNode, useState } from 'react';
import { LayoutDashboard, Users, Heart, Crown, LogOut, Menu, Flag } from 'lucide-react';
import { AdminPage } from './AdminApp';

const navItems: { id: AdminPage; label: string; icon: any; badge?: string }[] = [
  { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'matches', label: 'Matchs', icon: Heart },
  { id: 'reports', label: 'Signalements', icon: Flag },
  { id: 'premium', label: 'Premium', icon: Crown, badge: 'Bientôt' },
];

export default function AdminLayout({ children, currentPage, onNavigate, onLogout }: {
  children: ReactNode;
  currentPage: AdminPage;
  onNavigate: (p: AdminPage) => void;
  onLogout: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <aside className="hidden md:flex flex-col w-56 bg-slate-900 border-r border-slate-800 flex-shrink-0">
        <SidebarContent currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-slate-900 border-r border-slate-800">
            <SidebarContent currentPage={currentPage} onNavigate={p => { onNavigate(p); setMobileOpen(false); }} onLogout={onLogout} />
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5 text-slate-400" />
          </button>
          <span className="text-lg font-bold bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">
            amali admin
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({ currentPage, onNavigate, onLogout }: {
  currentPage: AdminPage;
  onNavigate: (p: AdminPage) => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="px-2 mb-8 mt-2">
        <h1 className="text-xl font-bold bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">amali</h1>
        <p className="text-xs text-slate-500 mt-0.5">Admin Panel</p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-slate-800 pt-3">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
        >
          ← Retour à l'app
        </button>
      </div>
    </div>
  );
}
