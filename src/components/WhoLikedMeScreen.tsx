import { useState, useEffect } from 'react';
import { Heart, Star } from 'lucide-react';
import { supabase, authService } from '@/lib/supabase';
import { withTransform } from '@/lib/imageUtils';
import Header from './Header';

interface LikerProfile {
  id: string;
  name: string;
  age: number;
  photo: string | null;
  location: string;
  like_type: 'like' | 'super_like';
  liked_at: string;
}

interface WhoLikedMeScreenProps {
  notificationCount?: number;
  onNotificationClick?: () => void;
  onOpenPremium: () => void;
  onNavigateToMessages?: (conversationId?: string) => void;
}

function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return age;
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
}

export default function WhoLikedMeScreen({
  notificationCount = 0,
  onNotificationClick,
  onNavigateToMessages,
}: WhoLikedMeScreenProps) {
  const [likers, setLikers] = useState<LikerProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [matchToast, setMatchToast] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { user } = await authService.getCurrentUser();
      if (!user) return;

      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .in('like_type', ['like', 'super_like']);
      setTotalCount(count ?? 0);

      const { data } = await supabase
        .from('likes')
        .select(`
          like_type,
          created_at,
          from_user:from_user_id (
            id, name, date_of_birth, profile_photo_url, location
          )
        `)
        .eq('to_user_id', user.id)
        .in('like_type', ['like', 'super_like'])
        .order('created_at', { ascending: false })
        .limit(200);

      // Pré-remplir les matchs déjà existants
      const { data: myMatches } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const alreadyMatchedIds = new Set<string>();
      myMatches?.forEach(m => {
        alreadyMatchedIds.add(m.user1_id === user.id ? m.user2_id : m.user1_id);
      });
      setMatchedIds(alreadyMatchedIds);

      setLikers(formatLikers(data));
    } catch (err) {
      console.error('WhoLikedMe error:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatLikers(data: any[] | null): LikerProfile[] {
    if (!data) return [];
    return data.map((row) => {
      const u = Array.isArray(row.from_user) ? row.from_user[0] : row.from_user;
      return {
        id:        u?.id ?? '',
        name:      u?.name ?? 'Utilisateur',
        age:       calculateAge(u?.date_of_birth ?? ''),
        photo:     u?.profile_photo_url ?? null,
        location:  u?.location ?? '',
        like_type: row.like_type,
        liked_at:  row.created_at,
      };
    });
  }

  async function likeBack(liker: LikerProfile) {
    if (loadingIds.has(liker.id) || matchedIds.has(liker.id)) return;

    setLoadingIds(prev => new Set(prev).add(liker.id));

    try {
      // Récupérer l'user directement depuis auth (évite tout problème de state)
      const { user } = await authService.getCurrentUser();
      if (!user) {
        console.error('❌ User non connecté');
        return;
      }
      const userId = user.id;

      // 1. Enregistrer le like retour (delete + insert pour éviter les doublons)
      await supabase
        .from('likes')
        .delete()
        .eq('from_user_id', userId)
        .eq('to_user_id', liker.id);

      const { error: likeError } = await supabase
        .from('likes')
        .insert({
          from_user_id: userId,
          to_user_id: liker.id,
          like_type: 'like',
          created_at: new Date().toISOString(),
        });

      if (likeError) {
        console.error('❌ Erreur like retour:', likeError);
        return;
      }

      // 2. Vérifier si match déjà existant
      const { data: existingMatch, error: matchCheckError } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${userId},user2_id.eq.${liker.id}),and(user1_id.eq.${liker.id},user2_id.eq.${userId})`)
        .maybeSingle();

      if (matchCheckError) {
        console.error('⚠️ Erreur vérification match:', matchCheckError);
        return;
      }

      if (existingMatch) {
        setMatchedIds(prev => new Set(prev).add(liker.id));
        return;
      }

      // 3. Créer le match
      const now = new Date().toISOString();
      const { data: newMatch, error: matchError } = await supabase
        .from('matches')
        .insert({
          user1_id: userId,
          user2_id: liker.id,
          status: 'accepted',
          compatibility_score: 85,
        })
        .select()
        .single();

      if (matchError) {
        console.error('❌ Erreur création match:', matchError);
        return;
      }

      // 4. Créer la conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          match_id: newMatch.id,
          user1_id: userId,
          user2_id: liker.id,
          last_message: null,
          last_message_at: now,
          user1_unread_count: 0,
          user2_unread_count: 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (convError) {
        console.error('❌ Erreur conversation:', convError);
      }

      // 5. Notifications aux deux utilisateurs
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('name, profile_photo_url')
        .eq('id', userId)
        .single();

      if (myProfile) {
        await supabase.from('notifications').insert({
          user_id: liker.id,
          type: 'new_match',
          title: 'Nouveau match ! 💕',
          message: `Vous avez matché avec ${myProfile.name} !`,
          data: { from_user_id: userId, from_user_name: myProfile.name, from_user_photo: myProfile.profile_photo_url },
          is_read: false,
        });
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'new_match',
          title: 'Nouveau match ! 💕',
          message: `Vous avez matché avec ${liker.name} !`,
          data: { from_user_id: liker.id, from_user_name: liker.name, from_user_photo: liker.photo },
          is_read: false,
        });
      }

      setMatchedIds(prev => new Set(prev).add(liker.id));
      setMatchToast(liker.name);
      setTimeout(() => setMatchToast(null), 3000);

      if (newConversation && onNavigateToMessages) {
        setTimeout(() => onNavigateToMessages(newConversation.id), 1500);
      }

    } catch (err) {
      console.error('❌ Erreur likeBack:', err);
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(liker.id);
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <Header
        notificationCount={notificationCount}
        onNotificationClick={onNotificationClick ?? (() => {})}
      />

      {/* Toast match */}
      {matchToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white px-5 py-3 rounded-2xl shadow-xl">
          <Heart className="w-4 h-4 fill-white" />
          <span className="text-sm font-semibold">Match avec {matchToast} ! 💕</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-24">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Qui vous a aimé
          </h1>
          {totalCount > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {totalCount} personne{totalCount > 1 ? 's' : ''} ont aimé votre profil
            </p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && totalCount === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-rose-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              Pas encore de likes
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Continuez à swiper — votre moitié est là !
            </p>
          </div>
        )}

        {!loading && totalCount > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {likers.map((liker, index) => {
              const isMatched = matchedIds.has(liker.id);
              const isLoading = loadingIds.has(liker.id);
              return (
                <div
                  key={`${liker.id}-${index}`}
                  className="relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700"
                >
                  <div className="relative h-48">
                    {liker.photo ? (
                      <img
                        src={withTransform(liker.photo, 400)}
                        alt={liker.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-rose-200 to-amber-200 dark:from-rose-900 dark:to-amber-900 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white">{liker.name[0]}</span>
                      </div>
                    )}
                    {liker.like_type === 'super_like' && (
                      <div className="absolute top-2 right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow">
                        <Star className="w-4 h-4 text-white fill-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                      {liker.name}{liker.age > 0 ? `, ${liker.age}` : ''}
                    </p>
                    {liker.location && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        📍 {liker.location}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {timeAgo(liker.liked_at)}
                    </p>

                    <button
                      onClick={() => likeBack(liker)}
                      disabled={isMatched || isLoading}
                      className={`mt-2 w-full py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        isMatched
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-gradient-to-r from-rose-500 to-amber-500 text-white active:scale-95'
                      }`}
                    >
                      {isLoading ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : isMatched ? (
                        <>✓ Matché</>
                      ) : (
                        <><Heart className="w-3 h-3 fill-white" /> Liker en retour</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
