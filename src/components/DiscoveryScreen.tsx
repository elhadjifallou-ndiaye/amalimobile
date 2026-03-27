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
      if (!user) {
        console.log('❌ Utilisateur non connecté');
        return;
      }

      setUserId(user.id);
      console.log('✅ User ID:', user.id);

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('gender, relationship_goal, profile_photo_url, latitude, longitude')
        .eq('id', user.id)
        .single();

      if (!myProfile) {
        console.log('❌ Profil non trouvé');
        return;
      }

      console.log('✅ Mon profil:', myProfile);
      setCurrentUserPhoto(myProfile.profile_photo_url);

      const calculateAge = (dateOfBirth: string) => {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      const { data: allProfiles, error } = await supabase
        .from('profiles')
        .select('*, is_premium, premium_tier')
        .neq('id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erreur de chargement des profils:', error);
        return;
      }

      console.log('📊 Profils bruts trouvés:', allProfiles?.length || 0);

      // Récupérer uniquement les vrais likes (pas les passes → ils peuvent réapparaître)
      const { data: myLikes, error: likesError } = await supabase
        .from('likes')
        .select('to_user_id')
        .eq('from_user_id', user.id)
        .in('like_type', ['like', 'super_like']);

      if (likesError) {
        console.error('⚠️ Erreur récupération likes:', likesError);
      }

      // 🔥 NOUVEAU : Récupérer les matchs existants
      const { data: myMatches, error: matchesError } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (matchesError) {
        console.error('⚠️ Erreur récupération matchs:', matchesError);
      }

      // Créer un Set des IDs déjà vus
      const seenUserIds = new Set<string>();
      
      // Ajouter les profils likés/passés
      myLikes?.forEach(like => seenUserIds.add(like.to_user_id));
      
      // Ajouter les matchs
      myMatches?.forEach(match => {
        if (match.user1_id === user.id) {
          seenUserIds.add(match.user2_id);
        } else {
          seenUserIds.add(match.user1_id);
        }
      });

      console.log('🚫 Profils déjà vus:', seenUserIds.size);

      const myLat = myProfile?.latitude ?? null;
      const myLng = myProfile?.longitude ?? null;

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
          const isValidGender = (g?: string) => !!(g && g !== 'null' && g !== 'undefined');
          const myGender = myProfile.gender?.toLowerCase();
          const theirGender = profile.gender?.toLowerCase();

          if (seenUserIds.has(profile.id)) {
            console.log(`🚫 [${profile.name}] déjà vu`);
            return false;
          }
          if (!profile.name) {
            console.log(`🚫 [${profile.id}] sans prénom`);
            return false;
          }
          // Les profils sans photo sont inclus avec un avatar par défaut
          if (profile.date_of_birth && profile.age < 18) {
            console.log(`🚫 [${profile.name}] mineur (${profile.age} ans)`);
            return false;
          }
          if (!isValidGender(theirGender)) {
            console.log(`🚫 [${profile.name}] sans genre`);
            return false;
          }
          if (!isValidGender(myGender)) {
            console.log(`✅ [${profile.name}] visible — je n'ai pas de genre`);
            return true;
          }
          if (myGender === theirGender) {
            console.log(`🚫 [${profile.name}] même genre (${theirGender})`);
            return false;
          }
          console.log(`✅ [${profile.name}] visible — genre opposé (${theirGender})`);
          return true;
        });

      const withPhoto = formattedProfiles.filter(p => p.profile_photo_url);
      const withoutPhoto = formattedProfiles.filter(p => !p.profile_photo_url);

      // Sans photo uniquement après 3 tours complets des profils avec photo
      const photoSwipeKey = `discovery_photo_swipes_${user.id}`;
      const photoSwipeCount = parseInt(localStorage.getItem(photoSwipeKey) || '0');
      const threshold = withPhoto.length * 3;
      const showWithoutPhoto = withPhoto.length === 0 || photoSwipeCount >= threshold;
      const mixed = showWithoutPhoto ? [...withPhoto, ...withoutPhoto] : withPhoto;

      console.log(`\n📊 FILTRE DISCOVERY — Mon genre: ${myProfile.gender || 'non défini'}`);
      console.log(`✅ Avec photo: ${withPhoto.length} | Sans photo: ${withoutPhoto.length} | Total: ${mixed.length} | Swipes photo: ${photoSwipeCount}/${threshold} | Sans photo visibles: ${showWithoutPhoto}`);

      if (formattedProfiles.length === 0) {
        console.log('⚠️ Aucun profil ne correspond');
        console.log('💡 Mon genre:', myProfile.gender || 'non défini');
        console.log('💡 Mon objectif:', myProfile.relationship_goal || 'non défini');
      }

      // Reprendre là où on s'était arrêté
      const lastSeenId = localStorage.getItem(`discovery_last_seen_${user.id}`);
      if (lastSeenId) {
        const lastIndex = formattedProfiles.findIndex(p => p.id === lastSeenId);
        if (lastIndex !== -1 && lastIndex + 1 < formattedProfiles.length) {
          setCurrentProfileIndex(lastIndex + 1);
        }
      }

      setProfiles(mixed);
    } catch (error) {
      console.error('❌ Erreur:', error);
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

    // Incrémenter le compteur si le profil a une photo
    if (currentProfile.profile_photo_url) {
      const key = `discovery_photo_swipes_${userId}`;
      const count = parseInt(localStorage.getItem(key) || '0');
      localStorage.setItem(key, String(count + 1));
    }

    setIsAnimating(true);

    try {
      if (action === 'like') {
        const success = await consumeLike();
        if (!success) {
          setShowNoLikesModal(true);
          setIsAnimating(false);
          return;
        }
        console.log('✅ Like consommé');
      }

      console.log('📝 Enregistrement du like...');
      
      const { error: likeError } = await supabase
        .from('likes')
        .upsert({
          from_user_id: userId,
          to_user_id: currentProfile.id,
          like_type: action === 'pass' ? 'pass' : 'like',
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'from_user_id,to_user_id',
        });

      if (likeError) {
        console.error('❌ Erreur lors du like:', likeError);
        console.error('❌ Détails:', JSON.stringify(likeError, null, 2));
      } else {
        console.log('✅ Like enregistré avec succès');
      }

      if (action === 'like' && !likeError) {
        console.log('🔔 Création de notification...');

        const { data: myProfile, error: profileError } = await supabase
          .from('profiles')
          .select('name, profile_photo_url')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('❌ Erreur récupération profil:', profileError);
        } else {
          console.log('👤 Mon profil récupéré:', myProfile);

          const { error: likeNotifErr } = await supabase.from('notifications').insert({
            user_id: currentProfile.id,
            type: 'new_like',
            title: `${myProfile.name} a aimé votre profil`,
            message: `${myProfile.name} a liké votre profil ❤️`,
            data: {
              from_user_id: userId,
              from_user_name: myProfile.name,
              from_user_photo: myProfile.profile_photo_url,
            },
            is_read: false,
          });
          if (likeNotifErr) console.error('❌ Notif like:', likeNotifErr);
          else console.log('✅ Notification like envoyée à:', currentProfile.name);
        }
      }

      if (action === 'like') {
        console.log('💕 Vérification du match mutuel...');

        try {
          const { data: mutualLike, error: mutualError } = await supabase
            .from('likes')
            .select('*')
            .eq('from_user_id', currentProfile.id)
            .eq('to_user_id', userId)
            .in('like_type', ['like', 'super_like'])
            .maybeSingle();

          if (mutualError) {
            console.error('⚠️ Erreur vérification match:', mutualError);
          } else if (mutualLike) {
            console.log('🎉 Match mutuel détecté !');

            const { data: existingMatch, error: matchCheckError } = await supabase
              .from('matches')
              .select('*')
              .or(`and(user1_id.eq.${userId},user2_id.eq.${currentProfile.id}),and(user1_id.eq.${currentProfile.id},user2_id.eq.${userId})`)
              .maybeSingle();

            if (matchCheckError) {
              console.error('⚠️ Erreur vérification match existant:', matchCheckError);
            }

            if (!existingMatch) {
              console.log('💕 Création du match...');

              const { data: newMatch, error: matchError } = await supabase
                .from('matches')
                .insert({
                  user1_id: userId,
                  user2_id: currentProfile.id,
                  status: 'accepted',
                  compatibility_score: 85,
                })
                .select()
                .single();

              if (matchError) {
                console.error('❌ Erreur création match:', matchError);
              } else {
                console.log('✅ Match créé avec succès !', newMatch);

                console.log('💬 Création de la conversation...');

                const { data: newConversation, error: convError } = await supabase
                  .from('conversations')
                  .insert({
                    match_id: newMatch.id,
                    user1_id: userId,
                    user2_id: currentProfile.id,
                    last_message: null,
                    last_message_at: new Date().toISOString(),
                    user1_unread_count: 0,
                    user2_unread_count: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .select()
                  .single();

                if (convError) {
                  console.error('❌ Erreur création conversation:', convError);
                  console.error('❌ Détails:', JSON.stringify(convError, null, 2));
                } else {
                  console.log('✅ Conversation créée avec succès !', newConversation);
                }

                const { data: myProfile } = await supabase
                  .from('profiles')
                  .select('name, profile_photo_url')
                  .eq('id', userId)
                  .single();

                if (myProfile) {
                  console.log('🔔 Création des notifications de match (insert direct)...');

                  // Insert direct (comme communauté) pour éviter tout problème de contrainte
                  const { error: notif1Err } = await supabase.from('notifications').insert({
                    user_id: currentProfile.id,
                    type: 'new_match',
                    title: 'Nouveau match ! 💕',
                    message: `Vous avez matché avec ${myProfile.name} !`,
                    data: {
                      from_user_id: userId,
                      from_user_name: myProfile.name,
                      from_user_photo: myProfile.profile_photo_url,
                    },
                    is_read: false,
                  });
                  if (notif1Err) console.error('❌ Notif match (autre user):', notif1Err);

                  const { error: notif2Err } = await supabase.from('notifications').insert({
                    user_id: userId,
                    type: 'new_match',
                    title: 'Nouveau match ! 💕',
                    message: `Vous avez matché avec ${currentProfile.name} !`,
                    data: {
                      from_user_id: currentProfile.id,
                      from_user_name: currentProfile.name,
                      from_user_photo: currentProfile.profile_photo_url,
                    },
                    is_read: false,
                  });
                  if (notif2Err) console.error('❌ Notif match (moi):', notif2Err);

                  if (!notif1Err && !notif2Err) console.log('✅ Notifications de match envoyées');
                }

                setMatchedUser({
                  id: currentProfile.id,
                  name: currentProfile.name,
                  photo: currentProfile.profile_photo_url,
                  age: currentProfile.age,
                  location: currentProfile.location,
                  conversationId: newConversation?.id ?? null,
                });

                setShowMatchModal(true);
              }
            } else {
              console.log('ℹ️ Match déjà existant, pas de duplication');
            }
          } else {
            console.log('ℹ️ Pas de match mutuel (pas encore)');
          }
        } catch (matchError) {
          console.error('❌ Erreur lors de la vérification du match:', matchError);
        }
      }

    } catch (error) {
      console.error('❌ Erreur générale lors de l\'action:', error);
    }

    setTimeout(() => {
      // Sauvegarder le dernier profil vu
      if (currentProfile && userId) {
        localStorage.setItem(`discovery_last_seen_${userId}`, currentProfile.id);
      }
      setCurrentProfileIndex(prev => prev + 1);
      setIsAnimating(false);
    }, 300);
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
              image:
                currentProfile.photos?.length > 0
                  ? currentProfile.photos
                  : currentProfile.profile_photo_url
                  ? [currentProfile.profile_photo_url]
                  : [],
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
            {profiles.length > 0 && (
              <button
                onClick={() => {
                  localStorage.removeItem(`discovery_last_seen_${userId}`);
                  setCurrentProfileIndex(0);
                }}
                className="px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                Recommencer
              </button>
            )}
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