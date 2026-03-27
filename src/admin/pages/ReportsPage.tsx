import { useEffect, useState } from 'react';
import { supabaseAdmin as supabase } from '../supabaseAdmin';
import { Flag, Check, X, Loader2, Trash2 } from 'lucide-react';

interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  type: string;
  post_id: string | null;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
  reporter_name: string;
  reported_name: string;
  reported_photo: string | null;
  post_content: string | null;
  post_image_url: string | null;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'reviewed' | 'resolved' | 'all'>('pending');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !data) { setLoading(false); return; }

    // Récupérer les noms des utilisateurs
    const userIds = [...new Set([...data.map(r => r.reporter_id), ...data.map(r => r.reported_user_id)])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, profile_photo_url')
      .in('id', userIds);

    const profileMap: Record<string, { name: string; photo: string | null }> = {};
    (profiles || []).forEach(p => { profileMap[p.id] = { name: p.name || 'Inconnu', photo: p.profile_photo_url }; });

    // Récupérer le contenu des posts signalés
    const postIds = data.filter(r => r.post_id).map(r => r.post_id as string);
    let postMap: Record<string, { content: string; image_url: string | null }> = {};
    if (postIds.length > 0) {
      const { data: posts } = await supabase
        .from('community_posts')
        .select('id, content, image_url')
        .in('id', postIds);
      (posts || []).forEach(p => { postMap[p.id] = { content: p.content, image_url: p.image_url }; });
    }

    setReports(data.map(r => ({
      ...r,
      reporter_name: profileMap[r.reporter_id]?.name || 'Inconnu',
      reported_name: profileMap[r.reported_user_id]?.name || 'Inconnu',
      reported_photo: profileMap[r.reported_user_id]?.photo || null,
      post_content: r.post_id ? (postMap[r.post_id]?.content ?? null) : null,
      post_image_url: r.post_id ? (postMap[r.post_id]?.image_url ?? null) : null,
    })));
    setLoading(false);
  };

  const updateStatus = async (id: string, status: 'reviewed' | 'resolved') => {
    await supabase.from('reports').update({ status }).eq('id', id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const deletePost = async (report: Report) => {
    if (!report.post_id) return;
    if (!confirm(`Supprimer définitivement la publication de ${report.reported_name} ?`)) return;

    setDeletingId(report.id);
    try {
      // Supprimer le post
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', report.post_id);

      if (error) throw error;

      // Marquer tous les signalements liés à ce post comme traités
      await supabase
        .from('reports')
        .update({ status: 'reviewed' })
        .eq('post_id', report.post_id);

      // Mettre à jour l'UI : retirer le contenu du post et marquer traité
      setReports(prev => prev.map(r =>
        r.post_id === report.post_id
          ? { ...r, status: 'reviewed', post_content: null, post_image_url: null }
          : r
      ));
    } catch (e: any) {
      alert('Erreur lors de la suppression : ' + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Signalements</h1>
          <p className="text-slate-400 text-sm mt-1">{reports.filter(r => r.status === 'pending').length} en attente</p>
        </div>
        <div className="flex gap-2">
          {(['pending', 'reviewed', 'resolved', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f === 'pending' ? 'En attente' : f === 'reviewed' ? 'Traités' : f === 'resolved' ? 'Résolus' : 'Tous'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun signalement</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                {/* Photo signalé */}
                <div className="flex-shrink-0">
                  {report.reported_photo ? (
                    <img src={report.reported_photo} className="w-12 h-12 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                      {report.reported_name[0]}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-semibold">{report.reported_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      report.type === 'post'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                      {report.type === 'post' ? '📝 Publication' : '💬 Chat'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                      report.status === 'pending'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : report.status === 'reviewed'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {report.status === 'pending' ? 'En attente' : report.status === 'reviewed' ? 'Traité' : 'Résolu'}
                    </span>
                  </div>

                  <p className="text-slate-400 text-xs mb-1">
                    Signalé par <span className="text-slate-300">{report.reporter_name}</span>
                    {' · '}{new Date(report.created_at).toLocaleDateString('fr-FR')}
                  </p>

                  {/* Raison du signalement */}
                  <div className="bg-slate-800 rounded-xl px-3 py-2 mt-2">
                    <p className="text-sm text-white font-medium">{report.reason}</p>
                    {report.details && <p className="text-xs text-slate-400 mt-0.5">{report.details}</p>}
                  </div>

                  {/* Contenu du post signalé */}
                  {report.type === 'post' && (
                    <div className="mt-3 border border-red-500/30 bg-red-500/5 rounded-xl p-3">
                      <p className="text-xs text-red-400 font-medium mb-1.5">Contenu de la publication</p>
                      {report.post_content === null && report.post_id ? (
                        <p className="text-xs text-slate-500 italic">Publication déjà supprimée</p>
                      ) : report.post_content ? (
                        <>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap">{report.post_content}</p>
                          {report.post_image_url && (
                            <img
                              src={report.post_image_url}
                              alt="Image du post"
                              className="mt-2 rounded-lg max-h-40 object-cover"
                            />
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 italic">Aucun contenu texte</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {report.status === 'pending' && (
                <div className="flex gap-2 mt-4 justify-end flex-wrap">
                  <button
                    onClick={() => updateStatus(report.id, 'resolved')}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Résoudre
                  </button>

                  {report.type === 'post' && report.post_id && report.post_content !== null && (
                    <button
                      onClick={() => deletePost(report)}
                      disabled={deletingId === report.id}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      {deletingId === report.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                      Supprimer la publication
                    </button>
                  )}

                  <button
                    onClick={() => updateStatus(report.id, 'reviewed')}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Marquer traité
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
