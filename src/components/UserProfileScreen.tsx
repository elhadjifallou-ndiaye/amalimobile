import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Briefcase, GraduationCap, Ruler, Sparkles, Heart, ChevronLeft, ChevronRight, } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserProfileScreenProps {
  userId: string;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  location: string;
  bio: string;
  profile_photo_url: string;
  photos: string[];
  profession: string;
  education_level: string;
  height: number;
  prayer_frequency: string;
  interests: string[];
  relationship_goal: string;
}

export default function UserProfileScreen({ userId, onClose }: UserProfileScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      console.error('❌ Erreur chargement profil:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const photos = profile?.photos && profile.photos.length > 0 
    ? profile.photos 
    : profile?.profile_photo_url 
      ? [profile.profile_photo_url] 
      : [];

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
        <div className="flex items-center justify-center h-full">
          <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
        <div className="flex items-center justify-center h-full">
          <p className="text-slate-600 dark:text-slate-400">Profil introuvable</p>
        </div>
      </div>
    );
  }

  const age = profile.date_of_birth ? calculateAge(profile.date_of_birth) : null;

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)', paddingBottom: '12px' }}
      >
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Photos Section */}
        {photos.length > 0 && (
          <div className="relative w-full aspect-[3/4] bg-slate-100 dark:bg-slate-800">
            <img
              src={photos[currentPhotoIndex]}
              alt={profile.name}
              className="w-full h-full object-cover"
            />

            {/* Photo Navigation */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-slate-900 dark:text-white" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-slate-900 dark:text-white" />
                </button>

                {/* Photo Indicators */}
                <div className="absolute top-4 left-0 right-0 flex gap-2 px-4">
                  {photos.map((_, index) => (
                    <div
                      key={index}
                      className={`flex-1 h-1 rounded-full transition-all ${
                        index === currentPhotoIndex
                          ? 'bg-white'
                          : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Photo Counter */}
            {photos.length > 1 && (
              <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm">
                {currentPhotoIndex + 1} / {photos.length}
              </div>
            )}
          </div>
        )}

        {/* Profile Info */}
        <div className="p-6 space-y-6">
          {/* Name & Age */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {profile.name}{age && `, ${age}`}
            </h1>
            {profile.location && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <MapPin className="w-4 h-4" />
                <span>{profile.location}</span>
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                À propos
              </h2>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-3">
            {profile.profession && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/20 rounded-full flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Profession</p>
                  <p className="font-medium text-slate-900 dark:text-white">{profile.profession}</p>
                </div>
              </div>
            )}

            {profile.education_level && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Éducation</p>
                  <p className="font-medium text-slate-900 dark:text-white">{profile.education_level}</p>
                </div>
              </div>
            )}

            {profile.height && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Taille</p>
                  <p className="font-medium text-slate-900 dark:text-white">{profile.height} cm</p>
                </div>
              </div>
            )}

            {profile.prayer_frequency && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Pratique religieuse</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {profile.prayer_frequency === '5-fois' && 'Prie 5 fois par jour'}
                    {profile.prayer_frequency === 'regulier' && 'Pratiquant régulier'}
                    {profile.prayer_frequency === 'occasionnel' && 'Pratiquant occasionnel'}
                    {profile.prayer_frequency === 'peu-importe' && 'Non spécifié'}
                  </p>
                </div>
              </div>
            )}

            {profile.relationship_goal && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/20 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Recherche</p>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {profile.relationship_goal === 'mariage' && 'Mariage'}
                    {profile.relationship_goal === 'relation-serieuse' && 'Relation sérieuse'}
                    {profile.relationship_goal === 'amitie' && 'Amitié'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                Centres d'intérêt
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-rose-100 to-amber-100 dark:from-rose-900/20 dark:to-amber-900/20 text-rose-700 dark:text-rose-400 rounded-full text-sm font-medium"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}