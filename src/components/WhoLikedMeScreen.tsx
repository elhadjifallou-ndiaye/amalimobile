import { useState, useEffect } from 'react';
import { Heart, Crown, Star, Sparkles, Lock, Clock } from 'lucide-react';
import { supabase, authService } from '@/lib/supabase';
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
}

function getVisibleLimit(tier: string | null): number {
  if (!tier) return 0;
  if (tier === 'essentiel') return 5;
  if (tier === 'elite') return 10;
  if (tier === 'prestige' || tier === 'prestige-femme') return 999;
  return 0;
}

const TIER_LABEL: Record<string, string> = {
  essentiel:        'Essentiel',
  elite:            'Élite',
  prestige:         'Prestige',
  'prestige-femme': 'Prestige Femme',
};

const TIER_ICON: Record<string, React.ElementType> = {
  essentiel:        Star,
  elite:            Crown,
  prestige:         Sparkles,
  'prestige-femme': Sparkles,
};

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
}: WhoLikedMeScreenProps) {
  const [likers, setLikers] = useState<LikerProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumTier, setPremiumTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  function handleSubscribe() {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  }

  async function loadData() {
    try {
      const { user } = await authService.getCurrentUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium, premium_tier, premium_expires_at')
        .eq('id', user.id)
        .single();

      const now = new Date();
      const isActive =
        profile?.is_premium &&
        profile?.premium_expires_at &&
        new Date(profile.premium_expires_at) > now;

      const tier = isActive ? profile?.premium_tier ?? null : null;
      setIsPremium(!!isActive);
      setPremiumTier(tier);

      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', user.id);
      setTotalCount(count ?? 0);

      const limit = getVisibleLimit(tier);
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
        .order('created_at', { ascending: false })
        .limit(limit === 0 ? 3 : limit === 999 ? 200 : limit);

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

  const visibleLimit = getVisibleLimit(premiumTier);
  const TierIcon = premiumTier ? TIER_ICON[premiumTier] : null;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <Header
        notificationCount={notificationCount}
        onNotificationClick={onNotificationClick ?? (() => {})}
      />

      {/* Toast bientôt disponible */}
      {showComingSoon && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-800 dark:bg-slate-700 text-white px-5 py-3 rounded-2xl shadow-xl">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium">Bientôt disponible</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-4">

        {/* Titre */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Qui vous a aimé
            </h1>
            {totalCount > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {totalCount} personne{totalCount > 1 ? 's' : ''} ont aimé votre profil
              </p>
            )}
          </div>
          {isPremium && TierIcon && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <TierIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                {TIER_LABEL[premiumTier!]}
              </span>
            </div>
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
          <>
            {/* Bannière premium (utilisateurs gratuits) */}
            {!isPremium && totalCount > 0 && (
              <div className="bg-gradient-to-r from-rose-500 to-amber-500 rounded-2xl p-5 mb-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold">
                      {totalCount} personne{totalCount > 1 ? 's' : ''} ont aimé votre profil
                    </p>
                    <p className="text-white/80 text-sm">Passez Premium pour les voir</p>
                  </div>
                </div>
                <div className="text-xs text-white/70 mb-3 space-y-1">
                  <p>• Essentiel : voir les 5 derniers</p>
                  <p>• Élite : voir les 10 derniers</p>
                  <p>• Prestige : voir tout le monde</p>
                </div>
                <button
                  onClick={handleSubscribe}
                  className="w-full py-2.5 bg-white text-rose-600 rounded-xl font-semibold text-sm hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Bientôt disponible
                </button>
              </div>
            )}

            {/* Bannière upgrade (essentiel ou elite) */}
            {isPremium && visibleLimit < 999 && totalCount > visibleLimit && (
              <div className="bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-5 flex items-center gap-3">
                <Crown className="w-8 h-8 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">
                    {totalCount - visibleLimit} like{totalCount - visibleLimit > 1 ? 's' : ''} masqué{totalCount - visibleLimit > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Passez {premiumTier === 'essentiel' ? 'Élite' : 'Prestige'} pour tout voir
                  </p>
                </div>
                <button
                  onClick={handleSubscribe}
                  className="px-3 py-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" />
                  Bientôt
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {likers.map((liker, index) => {
                const isBlurred = !isPremium || index >= visibleLimit;
                return (
                  <div
                    key={`${liker.id}-${index}`}
                    className="relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700"
                  >
                    <div className="relative h-48">
                      {liker.photo ? (
                        <img
                          src={liker.photo}
                          alt={isBlurred ? 'Profil masqué' : liker.name}
                          className={`w-full h-full object-cover transition-all duration-300 ${isBlurred ? 'blur-xl scale-110' : ''}`}
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br from-rose-200 to-amber-200 dark:from-rose-900 dark:to-amber-900 flex items-center justify-center ${isBlurred ? 'blur-xl' : ''}`}>
                          <span className="text-4xl font-bold text-white">
                            {isBlurred ? '?' : liker.name[0]}
                          </span>
                        </div>
                      )}
                      {isBlurred && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
                          <Lock className="w-8 h-8 text-white mb-1" />
                          <span className="text-white text-xs font-semibold">Premium</span>
                        </div>
                      )}
                      {!isBlurred && liker.like_type === 'super_like' && (
                        <div className="absolute top-2 right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow">
                          <Star className="w-4 h-4 text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      {isBlurred ? (
                        <>
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4 mb-1.5" />
                          <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded-full w-1/2" />
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Cartes fantômes pour likes cachés */}
              {!isPremium && totalCount > 3 &&
                Array.from({ length: Math.min(totalCount - 3, 4) }).map((_, i) => (
                  <div
                    key={`ghost-${i}`}
                    className="relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700"
                  >
                    <div className="h-48 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/30 flex items-center justify-center">
                      <div className="text-center">
                        <Lock className="w-8 h-8 text-rose-400 mx-auto mb-1" />
                        <span className="text-xs text-rose-500 font-medium">Premium</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4 mb-1.5" />
                      <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded-full w-1/2" />
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
}
