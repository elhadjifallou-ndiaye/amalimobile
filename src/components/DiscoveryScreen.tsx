import { useState, useEffect } from 'react';
import Header from './Header';
import ProfileCard from './ProfileCard';
import SettingsScreen from './SettingsScreen';
import NoMoreLikesModal from './NoMoreLikesModal';
import { supabase, authService } from '@/lib/supabase';
import MatchModal from './MatchModal';
import { useLikes } from '@/hooks/useLikes';

interface Profile {
  id: string;
  name: string;
  age: number;
  location: string;
  bio: string;
  profile_photo_url: string;
  photos: string[];
  profession: string;
  education_level: string;
  height: number;
  prayer_frequency: string;
  interests: string[];
  is_premium?: boolean;
  premium_tier?: 'essentiel' | 'elite' | 'prestige' | 'prestige-femme';
  latitude?: number | null;
  longitude?: number | null;
  distance?: number | null;
  gender?: string;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

interface DiscoveryScreenProps {
  onNavigateToMessages?: (conversationId?: string) => void;
  notificationCount?: number;
  onNotificationClick?: () => void;
}

export default function DiscoveryScreen({ onNavigateToMessages, notificationCount = 0, onNotificationClick }: DiscoveryScreenProps = {}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedUser, setMatchedUser] = useState<any>(null);
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string | null>(null);
  const [showNoLikesModal, setShowNoLikesModal] = useState(false);

  const {
    loading: likesLoading,
    consumeLike,
    canLike,
  } = useLikes(userId || '');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { user } = await authService.getCurrentUser();
      if (!user) return;

      setUserId(user.id);

      // Requêtes parallèles : profil + likes + matchs en même temps
      const [
        { data: myProfile },
        { data: myLikes },
        { data: myMatches },
        { data: allProfiles, error },
      ] = await Promise.all([
        supabase.from('profiles')
          .select('gender, relationship_goal, profile_photo_url, latitude, longitude')
          .eq('id', user.id)
          .single(),
        supabase.from('likes')
          .select('to_user_id, like_type')
          .eq('from_user_id', user.id),
        supabase.from('matches')
          .select('user1_id, user2_id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        supabase.from('profiles')
          .select('id, name, date_of_birth, gender, location, bio, profile_photo_url, photos, profession, education_level, height, prayer_frequency, interests, is_premium, premium_tier, latitude, longitude')
          .neq('id', user.id)
          .eq('profile_completed', true)
          .limit(100),
      ]);

      if (!myProfile || error) return;

      setCurrentUserPhoto(myProfile.profile_photo_url);

      const calculateAge = (dob: string) => {
        const today = new Date();
        const birth = new Date(dob);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
      };

      const likedIds = new Set<string>();
      const passedIds = new Set<string>();

      myLikes?.forEach(like => {
        if (like.like_type === 'pass') passedIds.add(like.to_user_id);
        else likedIds.add(like.to_user_id);
      });
      myMatches?.forEach(match => {
        likedIds.add(match.user1_id === user.id ? match.user2_id : match.user1_id);
      });

      const isValidUrl = (u?: string | null) =>
        !!(u && u !== 'null' && u !== 'undefined' && u.trim() !== '');
      const isValidGender = (g?: string) => !!(g && g !== 'null' && g !== 'undefined');
      const myGender = myProfile.gender?.toLowerCase();
      const myLat = myProfile.latitude ?? null;
      const myLng = myProfile.longitude ?? null;

      const formattedProfiles = (allProfiles || [])
        .map(profile => ({
          ...profile,
          age: profile.date_of_birth ? calculateAge(profile.date_of_birth) : 0,
          distance:
            myLat != null && myLng != null && profile.latitude != null && profile.longitude != null
              ? haversineKm(myLat, myLng, profile.latitude, profile.longitude)
              : null,
        }))
        .filter(profile => {
          if (likedIds.has(profile.id)) return false;
          if (!profile.name) return false;
          if (profile.date_of_birth && calculateAge(profile.date_of_birth) < 18) return false;
          const theirGender = profile.gender?.toLowerCase();
          if (!isValidGender(theirGender)) return false;
          if (isValidGender(myGender) && myGender === theirGender) return false;
          const hasPhoto = isValidUrl(profile.profile_photo_url) ||
            (Array.isArray(profile.photos) && profile.photos.some((u: string) => isValidUrl(u)));
          if (!hasPhoto) return false;
          return true;
        });

      const freshProfiles = formattedProfiles.filter(p => !passedIds.has(p.id));
      const passedProfiles = formattedProfiles.filter(p => passedIds.has(p.id));

      for (let i = freshProfiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [freshProfiles[i], freshProfiles[j]] = [freshProfiles[j], freshProfiles[i]];
      }

      setProfiles([...freshProfiles, ...passedProfiles]);
    } catch (error) {
      console.error('Discovery error:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentProfile = profiles[currentProfileIndex];

  const handleAction = async (action: 'like' | 'pass') => {
    if (!currentProfile || !userId) {
      console.log('❌ Pas de profil ou userId');
      return;
    }

    console.log('🎯 handleAction appelé:', {
      action,
      currentProfile: currentProfile.name,
      userId
    });

    if (action === 'like') {
      if (!canLike()) {
        console.log('❌ Plus de likes disponibles');
        setShowNoLikesModal(true);
        return;
      }
    }

    setIsAnimating(true);

    // Vérification du like avant tout (bloquant)
    if (action === 'like') {
      const success = await consumeLike();
      if (!success) {
        setShowNoLikesModal(true);
        setIsAnimating(false);
        return;
      }
    }

    // Avancer immédiatement la carte — le reste se fait en arrière-plan
    const profileSnapshot = { ...currentProfile };
    const userIdSnapshot = userId;

    setTimeout(() => {
      setCurrentProfileIndex(prev => prev + 1);
      setIsAnimating(false);
    }, 280);

    // Tout le reste en arrière-plan (fire & forget)
    (async () => {
      try {
        await supabase.from('likes').delete()
          .eq('from_user_id', userIdSnapshot)
          .eq('to_user_id', profileSnapshot.id);

        const { error: likeError } = await supabase.from('likes').insert({
          from_user_id: userIdSnapshot,
          to_user_id: profileSnapshot.id,
          like_type: action === 'pass' ? 'pass' : 'like',
          created_at: new Date().toISOString(),
        });

        if (likeError || action !== 'like') return;

        // Notification + vérification match en parallèle
        const [{ data: myProfile }, { data: mutualLike }] = await Promise.all([
          supabase.from('profiles').select('name, profile_photo_url').eq('id', userIdSnapshot).single(),
          supabase.from('likes').select('id')
            .eq('from_user_id', profileSnapshot.id)
            .eq('to_user_id', userIdSnapshot)
            .in('like_type', ['like', 'super_like'])
            .maybeSingle(),
        ]);

        if (myProfile) {
          supabase.from('notifications').insert({
            user_id: profileSnapshot.id,
            type: 'new_like',
            title: `${myProfile.name} a aimé votre profil`,
            message: `${myProfile.name} a liké votre profil ❤️`,
            data: { from_user_id: userIdSnapshot, from_user_name: myProfile.name, from_user_photo: myProfile.profile_photo_url },
            is_read: false,
          });
        }

        if (!mutualLike) return;

        // Match mutuel
        const { data: existingMatch } = await supabase.from('matches').select('id')
          .or(`and(user1_id.eq.${userIdSnapshot},user2_id.eq.${profileSnapshot.id}),and(user1_id.eq.${profileSnapshot.id},user2_id.eq.${userIdSnapshot})`)
          .maybeSingle();

        if (existingMatch) return;

        const now = new Date().toISOString();
        const { data: newMatch, error: matchError } = await supabase.from('matches')
          .insert({ user1_id: userIdSnapshot, user2_id: profileSnapshot.id, status: 'accepted', compatibility_score: 85 })
          .select().single();

        const matchId = newMatch?.id ?? (matchError ? (await supabase.from('matches').select('id')
          .or(`and(user1_id.eq.${userIdSnapshot},user2_id.eq.${profileSnapshot.id}),and(user1_id.eq.${profileSnapshot.id},user2_id.eq.${userIdSnapshot})`)
          .maybeSingle()).data?.id : null);

        if (!matchId) return;

        const { data: newConversation } = await supabase.from('conversations').insert({
          match_id: matchId,
          user1_id: userIdSnapshot,
          user2_id: profileSnapshot.id,
          last_message: null,
          last_message_at: now,
          user1_unread_count: 0,
          user2_unread_count: 0,
          created_at: now,
          updated_at: now,
        }).select().single();

        if (myProfile) {
          supabase.from('notifications').insert([
            { user_id: profileSnapshot.id, type: 'new_match', title: 'Nouveau match ! 💕', message: `Vous avez matché avec ${myProfile.name} !`, data: { from_user_id: userIdSnapshot, from_user_name: myProfile.name, from_user_photo: myProfile.profile_photo_url }, is_read: false },
            { user_id: userIdSnapshot, type: 'new_match', title: 'Nouveau match ! 💕', message: `Vous avez matché avec ${profileSnapshot.name} !`, data: { from_user_id: profileSnapshot.id, from_user_name: profileSnapshot.name, from_user_photo: profileSnapshot.profile_photo_url }, is_read: false },
          ]);
        }

        setMatchedUser({
          id: profileSnapshot.id,
          name: profileSnapshot.name,
          photo: profileSnapshot.profile_photo_url,
          age: profileSnapshot.age,
          location: profileSnapshot.location,
          conversationId: newConversation?.id ?? null,
        });
        setCurrentProfileIndex(prev => prev - 1);
        setShowMatchModal(true);
      } catch (err) {
        console.error('Action background error:', err);
      }
    })();
  };

  const handleUpgradeToPremium = () => {
    setShowNoLikesModal(false);
    alert('TODO: Ouvrir PremiumScreen');
  };

  if (showSettings) {
    return <SettingsScreen onClose={() => setShowSettings(false)} />;
  }

  if (loading || likesLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Header
          onSettingsClick={() => setShowSettings(true)}
          onNotificationClick={onNotificationClick}
          notificationCount={notificationCount}
        />

        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Chargement des profils...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex flex-col">
      <Header
        onSettingsClick={() => setShowSettings(true)}
        onNotificationClick={onNotificationClick}
        notificationCount={notificationCount}
      />

      {/* Main content area - full screen */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {currentProfile && currentProfileIndex < profiles.length ? (
          <div className="w-full h-full">
            <ProfileCard
            key={currentProfile.id}
            profile={{
              id: currentProfile.id,
              name: currentProfile.name,
              age: currentProfile.age,
              location: currentProfile.location,
              bio: currentProfile.bio || '',
              image: (() => {
                const isValid = (u?: string | null) =>
                  !!(u && u !== 'null' && u !== 'undefined' && u.trim() !== '');
                const mainPhoto = isValid(currentProfile.profile_photo_url)
                  ? currentProfile.profile_photo_url : null;
                const extraPhotos = (currentProfile.photos || [])
                  .filter((u: string) => isValid(u) && u !== mainPhoto);
                return mainPhoto ? [mainPhoto, ...extraPhotos] : extraPhotos;
              })(),
              interests: currentProfile.interests || [],
              distance: currentProfile.distance ?? 0,
              verified: true,
              compatibility: 85,
              profession: currentProfile.profession || '',
              education: currentProfile.education_level || '',
              height: currentProfile.height || 0,
              religion: currentProfile.prayer_frequency || '',
              premiumTier: currentProfile.premium_tier,
              gender: currentProfile.gender || '',
            }}
            onLike={() => handleAction('like')}
            onPass={() => handleAction('pass')}
            isAnimating={isAnimating}
          />
          </div>
        ) : (
          <div className="text-center max-w-md px-6">
            <div className="text-6xl mb-4">💫</div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {profiles.length === 0 ? 'Aucun profil disponible' : 'Plus de profils !'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {profiles.length === 0
                ? 'Revenez plus tard pour découvrir de nouveaux profils'
                : 'Revenez plus tard pour découvrir de nouveaux profils'}
            </p>
            <button
              onClick={() => {
                setCurrentProfileIndex(0);
                loadProfiles();
              }}
              className="px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              Actualiser
            </button>
          </div>
        )}
      </div>

      {showNoLikesModal && (
        <NoMoreLikesModal
          onClose={() => setShowNoLikesModal(false)}
          onUpgrade={handleUpgradeToPremium}
          onActivateBoost={() => {}}
          canUseBoost={false}
          timeUntilReset="5h 30min"
        />
      )}

      {showMatchModal && matchedUser && (                
        <MatchModal
          matchedUser={matchedUser}
          currentUserPhoto={currentUserPhoto}
          onClose={() => setShowMatchModal(false)}
          onSendMessage={() => {
            setShowMatchModal(false);
            if (onNavigateToMessages) onNavigateToMessages(matchedUser.conversationId ?? undefined);
          }}
          onKeepSwiping={() => {
            setShowMatchModal(false);
            setTimeout(() => {
              setCurrentProfileIndex(prev => prev + 1);
            }, 300);
          }}
        />
      )}
    </div>
  );
}NamedNodeMap