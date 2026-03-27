import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../supabaseAdmin';
import { Heart } from 'lucide-react';

interface Match {
  id: string;
  user1: { name: string; profile_photo_url: string | null };
  user2: { name: string; profile_photo_url: string | null };
  created_at: string;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMatches(); }, []);

  const loadMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select('id, created_at, user1_id, user2_id')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data) { setLoading(false); return; }

    const userIds = [...new Set(data.flatMap(m => [m.user1_id, m.user2_id]))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, profile_photo_url')
      .in('id', userIds);

    const map = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    setMatches(data.map(m => ({
      id: m.id,
      created_at: m.created_at,
      user1: map[m.user1_id] || { name: 'Inconnu', profile_photo_url: null },
      user2: map[m.user2_id] || { name: 'Inconnu', profile_photo_url: null },
    })));
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Matchs</h1>
        <p className="text-slate-400 text-sm mt-1">{matches.length} matchs créés</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs">
              <th className="text-left px-4 py-3 font-medium">Utilisateur 1</th>
              <th className="text-center px-4 py-3 font-medium"></th>
              <th className="text-left px-4 py-3 font-medium">Utilisateur 2</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12 text-slate-500">Chargement...</td></tr>
            ) : matches.map(m => (
              <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3"><UserCell name={m.user1.name} photo={m.user1.profile_photo_url} /></td>
                <td className="px-4 py-3 text-center"><Heart className="w-4 h-4 text-rose-500 fill-rose-500 mx-auto" /></td>
                <td className="px-4 py-3"><UserCell name={m.user2.name} photo={m.user2.profile_photo_url} /></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserCell({ name, photo }: { name: string; photo: string | null }) {
  return (
    <div className="flex items-center gap-2">
      {photo ? (
        <img src={photo} className="w-7 h-7 rounded-full object-cover" alt="" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-400 font-bold">
          {name?.[0] || '?'}
        </div>
      )}
      <span className="text-white font-medium">{name}</span>
    </div>
  );
}
