import { useState, useEffect } from 'react';
import { Crown, User, Settings, Home, LogOut, Shield, Bell, HelpCircle, Trash2, Camera, Star, Sparkles, Check } from 'lucide-react';
import Header from './Header';
import PremiumScreen from './PremiumScreen';
import SettingsScreen from './SettingsScreen';
import EditProfileModal from './EditProfileModal';
import { authService, AuthUser, supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageUtils';

export default function ProfileScreen() {
  const [showPremium, setShowPremium] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const [isPremium, setIsPremium] = useState(false);
  const [premiumTier, setPremiumTier] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [gender, setGender] = useState<string>('');
  
  const [stats, setStats] = useState({
    matches: 0,
    compatibility: 0,
    conversations: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadUser();
    loadRealStats();
  }, []);

  const loadUser = async () => {
    const { user } = await authService.getCurrentUser();
    if (user) {
      setUser(user as AuthUser);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_photo_url, is_premium, premium_tier, location, gender')
        .eq('id', user.id)
        .single();
      
      console.log('🔍 Mon profil premium:', profile);
      
      if (profile?.profile_photo_url) {
        setProfilePhotoUrl(profile.profile_photo_url);
      }
      if (profile?.location) {
        setLocation(profile.location);
      }
      if (profile?.gender) {
        setGender(profile.gender);
      }
      
      if (profile?.is_premium) {
        setIsPremium(true);
        setPremiumTier(profile.premium_tier);
        console.log('✅ Premium activé:', profile.premium_tier);
      } else {
        console.log('ℹ️ Pas premium');
      }
    }
  };

  const loadRealStats = async () => {
    setLoadingStats(true);
    
    try {
      const { user } = await authService.getCurrentUser();
      if (!user) return;

      const { count: matchesCount, error: matchesError } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (matchesError) {
        console.error('Erreur matchs:', matchesError);
      }

      const { count: conversationsCount, error: conversationsError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .not('last_message', 'is', null);

      if (conversationsError) {
        console.error('Erreur conversations:', conversationsError);
      }

      const { data: matchesData, error: compatError } = await supabase
        .from('matches')
        .select('compatibility_score')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (compatError) {
        console.error('Erreur compatibilité:', compatError);
      }

      let avgCompatibility = 0;
      if (matchesData && matchesData.length > 0) {
        const totalScore = matchesData.reduce((sum, match) => sum + (match.compatibility_score || 0), 0);
        avgCompatibility = Math.round(totalScore / matchesData.length);
      }

      setStats({
        matches: matchesCount || 0,
        compatibility: avgCompatibility,
        conversations: conversationsCount || 0,
      });

      console.log('✅ Stats chargées:', {
        matches: matchesCount || 0,
        compatibility: avgCompatibility,
        conversations: conversationsCount || 0,
      });
    } catch (error) {
      console.error('❌ Erreur de chargement des stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const getTierInfo = () => {
    switch (premiumTier) {
      case 'essentiel':
        return {
          name: 'Essentiel',
          icon: Star,
          gradient: 'from-amber-600 to-orange-700',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-500',
          features: [
            '80 likes par jour',
            '5 super likes par jour',
            'Profil mis en avant',
          ],
        };
      case 'elite':
        return {
          name: 'Élite',
          icon: Crown,
          gradient: 'from-yellow-500 to-amber-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-500',
          features: [
            '100 likes par jour',
            '7 super likes par jour',
            'Voir qui vous a aimé',
            'Annuler un swipe',
            'Visibilité accrue',
          ],
        };
      case 'prestige':
        return {
          name: 'Prestige',
          icon: Sparkles,
          gradient: 'from-slate-400 to-slate-600',
          bgColor: 'bg-slate-50 dark:bg-slate-800',
          borderColor: 'border-slate-400',
          features: [
            'Likes illimités',
            '20 super likes par jour',
            'Appels vidéo',
            'Voir qui vous a aimé',
            'Annuler un swipe',
            'Visibilité maximale',
            'Statistiques de popularité',
          ],
        };
      default:
        return null;
    }
  };

  const tierInfo = getTierInfo();

  const handleLogout = async () => {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await authService.signOut();
      window.location.reload();
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = confirm(
      '⚠️ ATTENTION : Cette action est irréversible.\n\n' +
      'Êtes-vous absolument sûr de vouloir supprimer votre compte ?\n\n' +
      'Toutes vos données seront définitivement supprimées :\n' +
      '- Votre profil\n' +
      '- Vos messages\n' +
      '- Vos matchs\n' +
      '- Vos photos'
    );

    if (!confirmation) return;

    const doubleConfirmation = confirm(
      'Dernière confirmation : Tapez OK pour supprimer définitivement votre compte'
    );

    if (!doubleConfirmation) return;

    try {
      if (!user) return;

      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (deleteError) throw deleteError;

      const { data: files } = await supabase.storage
        .from('profile-photos')
        .list(user.id);

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`);
        await supabase.storage
          .from('profile-photos')
          .remove(filePaths);
      }

      await authService.signOut();
      alert('Votre compte a été supprimé avec succès.');
      window.location.reload();
    } catch (error: any) {
      alert('Erreur lors de la suppression du compte : ' + error.message);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La taille de l\'image ne doit pas dépasser 5 MB');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      if (profilePhotoUrl) {
        const oldFileName = profilePhotoUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('profile-photos')
            .remove([`${user.id}/${oldFileName}`]);
        }
      }

      const fileName = `${user.id}/profile_${Date.now()}.jpg`;

      let uploadBlob: Blob;
      try {
        uploadBlob = await compressImage(file);
      } catch {
        uploadBlob = file;
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, uploadBlob, {
          contentType: 'image/jpeg',
          cacheControl: '31536000',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          profile_photo_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfilePhotoUrl(urlData.publicUrl);
      alert('Photo de profil mise à jour avec succès ! ✨');
    } catch (error: any) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'upload de la photo : ' + error.message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (showPremium) {
    return <PremiumScreen userGender={gender} onClose={() => {
      setShowPremium(false);
      loadUser();
    }} />;
  }

  if (showSettings) {
    return <SettingsScreen onClose={() => setShowSettings(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex flex-col">
      <Header showSettings={false} />
      
      {isEditing && user && (
        <EditProfileModal
          user={user}
          onClose={() => setIsEditing(false)}
          onSave={loadUser}
        />
      )}
      
      {/* Content scrollable */}
      <div
        className="flex-1 overflow-y-auto px-5 pb-6"
        style={{ paddingTop: 'calc(max(env(safe-area-inset-top), 12px) + 4.5rem)' }}
      >
        {/* Carte de profil */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
          {/* Image de profil et info de base */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt="Photo de profil"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    setProfilePhotoUrl(null);
                  }}
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center text-white border-4 border-white dark:border-slate-700 shadow-lg">
                  <span className="text-3xl font-bold">
                    {user?.user_metadata?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-700 hover:bg-emerald-600 transition-colors cursor-pointer shadow-md">
                {isUploadingPhoto ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploadingPhoto}
                />
              </label>
            </div>
            
            {/* Nom avec badge bleu */}
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-slate-900 dark:text-white font-bold text-xl">
                {user?.user_metadata?.name || 'Mon Profil'}
              </h2>
              {isPremium && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            <p className="text-slate-600 dark:text-slate-400 mb-1">{user?.email || 'Email non disponible'}</p>
            {user?.user_metadata?.phone && (
              <p className="text-slate-500 dark:text-slate-500 text-sm mb-3">{user.user_metadata.phone}</p>
            )}
            {location && (
              <p className="text-slate-500 dark:text-slate-500 text-sm mb-3">{location}</p>
            )}
            
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">Profil vérifié</span>
            </div>
          </div>

          {/* Avantages Premium ou CTA */}
          {isPremium && tierInfo ? (
            <div className={`p-5 ${tierInfo.bgColor} border-2 ${tierInfo.borderColor} rounded-2xl mb-6`}>
              <div className="flex items-center gap-2 mb-3">
                <tierInfo.icon className="w-5 h-5" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Membre {tierInfo.name}
                </h3>
              </div>
              <div className="space-y-2">
                {tierInfo.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${tierInfo.gradient} flex items-center justify-center flex-shrink-0`}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowPremium(true)}
              className="w-full mb-6 p-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl text-white hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl active:scale-98"
            >
              <div className="flex items-center justify-center gap-3">
                <Crown className="w-5 h-5" />
                <span className="font-semibold">Passer à Premium</span>
              </div>
            </button>
          )}

          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            {loadingStats ? (
              <>
                <StatItem value="..." label="Matchs" />
                <StatItem value="..." label="Compatibilité" />
                <StatItem value="..." label="Conversations" />
              </>
            ) : (
              <>
                <StatItem value={stats.matches.toString()} label="Matchs" />
                <StatItem 
                  value={stats.compatibility > 0 ? `${stats.compatibility}%` : '—'} 
                  label="Compatibilité" 
                />
                <StatItem value={stats.conversations.toString()} label="Conversations" />
              </>
            )}
          </div>
        </div>

        {/* Options du menu */}
        <div className="space-y-2 pb-32">
          <MenuItem 
            icon={User} 
            label="Modifier le profil" 
            onClick={() => setIsEditing(true)} 
          />
          <MenuItem 
            icon={Shield} 
            label="Mode Halal & Confidentialité" 
            badge="Actif" 
            onClick={() => setShowSettings(true)} 
          />
          <MenuItem 
            icon={Bell} 
            label="Notifications" 
            onClick={() => setShowSettings(true)} 
          />
          <MenuItem 
            icon={Settings} 
            label="Paramètres" 
            onClick={() => setShowSettings(true)} 
          />
          <MenuItem 
            icon={HelpCircle} 
            label="Aide & Support" 
            onClick={() => window.open('https://www.amali.live/Centre-d\'aide.html', '_blank')}
          />
          <MenuItem 
            icon={Home} 
            label="Retour à l'accueil" 
            onClick={() => window.location.reload()} 
          />
          <MenuItem 
            icon={LogOut} 
            label="Se déconnecter" 
            variant="danger" 
            onClick={handleLogout} 
          />
          <MenuItem 
            icon={Trash2} 
            label="Supprimer mon compte" 
            variant="danger" 
            onClick={handleDeleteAccount} 
          />
        </div>
      </div>
    </div>
  );
}

interface StatItemProps {
  value: string;
  label: string;
}

function StatItem({ value, label }: StatItemProps) {
  return (
    <div className="text-center">
      <p className="text-slate-900 dark:text-white font-semibold text-lg mb-1">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  badge?: string;
  variant?: 'default' | 'danger';
  onClick?: () => void;
}

function MenuItem({ icon: Icon, label, badge, variant = 'default', onClick }: MenuItemProps) {
  const isDanger = variant === 'danger';
  
  return (
    <button 
      onClick={onClick || (() => console.log('Clic sur', label))}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
        isDanger 
          ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800' 
          : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
      }`}
    >
      <Icon className={`w-5 h-5 ${isDanger ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`} />
      <span className={`flex-1 text-left ${isDanger ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
        {label}
      </span>
      {badge && (
        <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
          {badge}
        </span>
      )}
    </button>
  );
}