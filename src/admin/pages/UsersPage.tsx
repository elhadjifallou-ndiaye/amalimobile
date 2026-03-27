import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../supabaseAdmin';
import { Search, Download, User, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface UserRow {
  id: string;
  name: string;
  gender: string;
  location: string;
  profile_completed: boolean;
  created_at: string;
  profile_photo_url: string | null;
  is_premium: boolean;
}

const PAGE_SIZE = 20;

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => { loadUsers(); }, [page, search]);

  const loadUsers = async () => {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('id, name, gender, location, profile_completed, created_at, profile_photo_url, is_premium', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (search) query = query.ilike('name', `%${search}%`);

    const { data, count } = await query;
    setUsers(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const exportCSV = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, gender, location, profile_completed, created_at')
      .order('created_at', { ascending: false });

    if (!data) return;
    const headers = ['ID', 'Nom', 'Genre', 'Localisation', 'Profil complété', 'Date inscription'];
    const rows = data.map(u => [
      u.id, u.name || '', u.gender || '', u.location || '',
      u.profile_completed ? 'Oui' : 'Non',
      new Date(u.created_at).toLocaleDateString('fr-FR'),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `amali-users-${Date.now()}.csv`; a.click();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
          <p className="text-slate-400 text-sm mt-1">{total.toLocaleString()} inscrits</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm rounded-xl transition-colors"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Rechercher par nom..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs">
                <th className="text-left px-4 py-3 font-medium">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium">Genre</th>
                <th className="text-left px-4 py-3 font-medium">Ville</th>
                <th className="text-left px-4 py-3 font-medium">Profil</th>
                <th className="text-left px-4 py-3 font-medium">Premium</th>
                <th className="text-left px-4 py-3 font-medium">Inscription</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500">Chargement...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500">Aucun résultat</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.profile_photo_url ? (
                        <img src={user.profile_photo_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{user.name || 'Sans nom'}</p>
                        <p className="text-slate-600 text-xs">{user.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.gender || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        await supabase.from('profiles').update({ gender: val }).eq('id', user.id);
                        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, gender: val } : u));
                      }}
                      className={`text-xs px-2 py-1 rounded-lg border bg-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                        !user.gender
                          ? 'border-amber-500 text-amber-400'
                          : 'border-slate-700 text-slate-300'
                      }`}
                    >
                      <option value="">— Non défini</option>
                      <option value="homme">Homme</option>
                      <option value="femme">Femme</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{user.location || '—'}</td>
                  <td className="px-4 py-3">
                    {user.profile_completed
                      ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle className="w-3.5 h-3.5" />Complet</span>
                      : <span className="flex items-center gap-1 text-slate-500 text-xs"><XCircle className="w-3.5 h-3.5" />Incomplet</span>}
                  </td>
                  <td className="px-4 py-3">
                    {user.is_premium
                      ? <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Premium</span>
                      : <span className="text-xs text-slate-600">Gratuit</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">Page {page + 1} / {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-700">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
