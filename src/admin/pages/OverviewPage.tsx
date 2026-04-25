import { useEffect, useState, useCallback } from 'react';
import { supabaseAdmin as supabase } from '../supabaseAdmin';
import { Users, Heart, MessageCircle, TrendingUp, UserCheck, Activity, AlertTriangle, EyeOff, Flag, RefreshCw, Calendar } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';

type Preset = 'today' | 'week' | 'month' | 'custom';

interface Stats {
  totalUsers: number;
  completedProfiles: number;
  totalMatches: number;
  totalConversations: number;
  totalMessages: number;
  newUsersToday: number;
  newUsersWeek: number;
  maleCount: number;
  femaleCount: number;
  pendingReports: number;
  // Exclus Discovery
  noGender: number;
  noPhoto: number;
  noName: number;
  noAge: number;
  underage: number;
  incompleteProfile: number;
  visibleInDiscovery: number;
  // Période filtrée
  periodUsers: number;
  periodMatches: number;
  periodMessages: number;
}

function toLocalISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [subEvolution, setSubEvolution] = useState<{ date: string; total: number }[]>([]);

  const [preset, setPreset] = useState<Preset>('week');
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(toLocalISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))));
  const [dateTo, setDateTo] = useState(toLocalISODate(now));

  const applyPreset = useCallback((p: Preset) => {
    const n = new Date();
    const todayStr = toLocalISODate(n);
    if (p === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (p === 'week') {
      const dow = n.getDay() === 0 ? 6 : n.getDay() - 1;
      setDateFrom(toLocalISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate() - dow)));
      setDateTo(todayStr);
    } else if (p === 'month') {
      setDateFrom(toLocalISODate(new Date(n.getFullYear(), n.getMonth(), 1)));
      setDateTo(todayStr);
    }
    setPreset(p);
  }, []);

  const loadStats = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    // Début du lundi de la semaine en cours (pas une fenêtre glissante)
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // lundi = 0
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).toISOString();

    const periodStart = `${dateFrom}T00:00:00.000Z`;
    const periodEnd = `${dateTo}T23:59:59.999Z`;

    const [
      { count: totalUsers },
      { count: completedProfiles },
      { count: totalMatches },
      { count: totalConversations },
      { count: totalMessages },
      { count: newUsersToday },
      { count: newUsersWeek },
      { count: maleCount },
      { count: femaleCount },
      { count: pendingReports },
      { count: noGender },
      { count: noPhoto },
      { count: noName },
      { count: noAge },
      { count: incompleteProfile },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('profile_completed', true),
      supabase.from('matches').select('*', { count: 'exact', head: true }),
      supabase.from('conversations').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfWeek),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('gender', 'homme'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('gender', 'femme'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).or('gender.is.null,gender.eq.,gender.eq.null,gender.eq.undefined'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).is('profile_photo_url', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).or('name.is.null,name.eq.'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).is('date_of_birth', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('profile_completed', false),
    ]);

    // Stats de la période filtrée
    const [
      { count: periodUsers },
      { count: periodMatches },
      { count: periodMessages },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', periodStart).lte('created_at', periodEnd),
      supabase.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', periodStart).lte('created_at', periodEnd),
      supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', periodStart).lte('created_at', periodEnd),
    ]);

    // Mineurs : date_of_birth > il y a 18 ans
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    const { count: underage } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('date_of_birth', 'is', null)
      .gt('date_of_birth', eighteenYearsAgo.toISOString().split('T')[0]);

    // Profils visibles = complétés + avec genre + prénom (photo et âge facultatifs)
    const { count: visibleInDiscovery } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('profile_completed', true)
      .not('gender', 'is', null)
      .neq('gender', '')
      .neq('gender', 'null')
      .not('name', 'is', null)
      .neq('name', '');

    // Courbe évolution des inscriptions
    const { data: usersData } = await supabase
      .from('profiles')
      .select('created_at')
      .order('created_at', { ascending: true });

    const grouped: Record<string, number> = {};
    (usersData ?? []).forEach((p: { created_at: string }) => {
      const date = p.created_at.split('T')[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });
    const sortedDates = Object.keys(grouped).sort();
    let cum = 0;
    setSubEvolution(sortedDates.map((date) => {
      cum += grouped[date];
      return { date: date.substring(5).replace('-', '/'), total: cum };
    }));

    setStats({
      totalUsers: totalUsers || 0,
      completedProfiles: completedProfiles || 0,
      totalMatches: totalMatches || 0,
      totalConversations: totalConversations || 0,
      totalMessages: totalMessages || 0,
      newUsersToday: newUsersToday || 0,
      newUsersWeek: newUsersWeek || 0,
      maleCount: maleCount || 0,
      femaleCount: femaleCount || 0,
      pendingReports: pendingReports || 0,
      noGender: noGender || 0,
      noPhoto: noPhoto || 0,
      noName: noName || 0,
      noAge: noAge || 0,
      underage: underage || 0,
      incompleteProfile: incompleteProfile || 0,
      visibleInDiscovery: visibleInDiscovery || 0,
      periodUsers: periodUsers || 0,
      periodMatches: periodMatches || 0,
      periodMessages: periodMessages || 0,
    });
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => loadStats(), 60_000);
    return () => clearInterval(interval);
  }, [loadStats, dateFrom, dateTo]);

  const cards = [
    { label: 'Profils actifs (Discovery)', value: stats?.visibleInDiscovery, icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    { label: 'Utilisateurs total', value: stats?.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Profils complétés', value: stats?.completedProfiles, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Matchs créés', value: stats?.totalMatches, icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    { label: 'Conversations', value: stats?.totalConversations, icon: MessageCircle, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: 'Messages envoyés', value: stats?.totalMessages, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Inscrits cette semaine', value: stats?.newUsersWeek, icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
  ];

  const presetLabel: Record<Preset, string> = { today: "Aujourd'hui", week: 'Cette semaine', month: 'Ce mois', custom: 'Personnalisé' };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vue d'ensemble</h1>
          <p className="text-slate-400 text-sm mt-1">
            {lastUpdated
              ? `Mis à jour à ${lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Chargement…'}
          </p>
        </div>
        <button
          onClick={() => loadStats(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </div>

      {/* Filtre par période */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Période d'analyse</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {(['today', 'week', 'month', 'custom'] as Preset[]).map(p => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                preset === p
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {presetLabel[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPreset('custom'); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-rose-500"
          />
          <span className="text-slate-500 text-sm">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPreset('custom'); }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Cartes période */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: `Inscrits (${presetLabel[preset].toLowerCase()})`, value: stats?.periodUsers, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: TrendingUp },
          { label: `Matchs (${presetLabel[preset].toLowerCase()})`, value: stats?.periodMatches, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Heart },
          { label: `Messages (${presetLabel[preset].toLowerCase()})`, value: stats?.periodMessages, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: MessageCircle },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`bg-slate-900 border rounded-2xl p-4 ${card.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-400 text-xs leading-tight">{card.label}</p>
                <Icon className={`w-4 h-4 flex-shrink-0 ${card.color}`} />
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>
                {loading ? '—' : (card.value ?? 0).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-rose-500/20 to-amber-500/20 border border-rose-500/30 rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-slate-300 text-sm">Nouveaux inscrits aujourd'hui</p>
          <p className="text-4xl font-bold text-white">{loading ? '—' : stats?.newUsersToday}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`bg-slate-900 border rounded-2xl p-4 ${card.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-xs">{card.label}</p>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">
                {loading ? '—' : (card.value ?? 0).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Répartition genre + signalements */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4">
          <p className="text-slate-400 text-xs mb-3">Hommes</p>
          <p className="text-2xl font-bold text-blue-400">{loading ? '—' : stats?.maleCount ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">{!loading && stats ? Math.round(((stats.maleCount) / Math.max(stats.totalUsers,1))*100) : 0}%</p>
        </div>
        <div className="bg-slate-900 border border-pink-500/20 rounded-2xl p-4">
          <p className="text-slate-400 text-xs mb-3">Femmes</p>
          <p className="text-2xl font-bold text-pink-400">{loading ? '—' : stats?.femaleCount ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">{!loading && stats ? Math.round(((stats.femaleCount) / Math.max(stats.totalUsers,1))*100) : 0}%</p>
        </div>
        <div className="bg-slate-900 border border-orange-500/20 rounded-2xl p-4 cursor-pointer" onClick={() => (window as any).__adminNavigate?.('reports')}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 text-xs">Signalements</p>
            <Flag className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-orange-400">{loading ? '—' : stats?.pendingReports ?? 0}</p>
          {!loading && (stats?.pendingReports ?? 0) > 0 && (
            <p className="text-xs text-orange-400 mt-1">En attente</p>
          )}
        </div>
      </div>

      {/* Graphiques */}
      {!loading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* Donut — Répartition genre */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">Répartition genre</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Hommes', value: stats.maleCount },
                    { name: 'Femmes', value: stats.femaleCount },
                    ...(stats.totalUsers - stats.maleCount - stats.femaleCount > 0
                      ? [{ name: 'Non défini', value: stats.totalUsers - stats.maleCount - stats.femaleCount }]
                      : []),
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  <Cell fill="#60a5fa" />
                  <Cell fill="#f472b6" />
                  <Cell fill="#475569" />
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  formatter={(value: any, name: any) => [`${value} (${Math.round(((value as number) / Math.max(stats.totalUsers, 1)) * 100)}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-xs mt-1">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />Hommes</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block" />Femmes</span>
              {stats.totalUsers - stats.maleCount - stats.femaleCount > 0 && (
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />Autre</span>
              )}
            </div>
          </div>

          {/* Bar — Profils exclus */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">Profils exclus de Discovery</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { label: 'Sans genre', value: stats.noGender },
                  { label: 'Incomplet', value: stats.incompleteProfile },
                  { label: 'Sans âge', value: stats.noAge },
                  { label: 'Mineurs', value: stats.underage },
                  { label: 'Sans prénom', value: stats.noName },
                ]}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[
                    <Cell key="0" fill="#f59e0b" />,
                    <Cell key="1" fill="#64748b" />,
                    <Cell key="2" fill="#a78bfa" />,
                    <Cell key="3" fill="#ef4444" />,
                    <Cell key="4" fill="#f97316" />,
                  ]}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Area — Évolution abonnements */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm">Évolution des inscriptions</h3>
            {subEvolution.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">Aucune donnée</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={subEvolution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: 12 }}
                    formatter={(value: any) => [value, 'Utilisateurs']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#f43f5e" strokeWidth={2} fill="url(#subGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>
      )}

      {/* Section profils exclus de Discovery */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <EyeOff className="w-5 h-5 text-amber-400" />
          <h2 className="text-white font-semibold">Profils exclus de Discovery</h2>
          <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            {loading ? '—' : stats?.visibleInDiscovery} visibles
          </span>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Sans genre', value: stats?.noGender, color: 'bg-amber-500', urgent: true },
            { label: 'Profil incomplet (non soumis)', value: stats?.incompleteProfile, color: 'bg-slate-500', urgent: false },
            { label: 'Sans date de naissance', value: stats?.noAge, color: 'bg-purple-500', urgent: false },
            { label: 'Mineurs (-18 ans)', value: stats?.underage, color: 'bg-red-500', urgent: true },
            { label: 'Sans prénom', value: stats?.noName, color: 'bg-orange-500', urgent: false },
          ].map((item, i) => {
            const val = item.value ?? 0;
            const total = stats?.totalUsers || 1;
            const pct = Math.round((val / total) * 100);
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300 flex items-center gap-2">
                    {item.urgent && val > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    {item.label}
                  </span>
                  <span className={`text-sm font-semibold ${item.urgent && val > 0 ? 'text-amber-400' : 'text-white'}`}>
                    {loading ? '—' : val}
                    <span className="text-slate-500 font-normal ml-1 text-xs">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${item.color}`}
                    style={{ width: loading ? '0%' : `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Info : profils avec avatar */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Avec avatar (sans photo)</p>
            <p className="text-lg font-bold text-blue-400">{loading ? '—' : stats?.noPhoto ?? 0}</p>
            <p className="text-xs text-slate-500">Visibles avec silhouette</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Sans date de naissance</p>
            <p className="text-lg font-bold text-purple-400">{loading ? '—' : stats?.noAge ?? 0}</p>
            <p className="text-xs text-slate-500">Âge masqué</p>
          </div>
        </div>
      </div>
    </div>
  );
}
