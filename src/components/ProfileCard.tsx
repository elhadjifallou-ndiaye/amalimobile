import { useState, useRef } from 'react';
import { X, Heart, MapPin, Briefcase, GraduationCap, Ruler, Sparkles, Crown, Star } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  age: number;
  location: string;
  bio: string;
  image: string[];
  interests: string[];
  distance: number;
  verified: boolean;
  compatibility: number;
  profession: string;
  education: string;
  height: number;
  religion: string;
  premiumTier?: 'essentiel' | 'elite' | 'prestige' | 'prestige-femme';
  gender?: string;
}

interface ProfileCardProps {
  profile: Profile;
  onLike: () => void;
  onPass: () => void;
  isAnimating: boolean;
}

const AVATAR_MALE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%231e3a5f'/%3E%3Ccircle cx='200' cy='200' r='85' fill='%2394a3b8'/%3E%3Cellipse cx='200' cy='480' rx='150' ry='130' fill='%2394a3b8'/%3E%3Ccircle cx='200' cy='200' r='70' fill='%23cbd5e1'/%3E%3Cellipse cx='200' cy='460' rx='120' ry='110' fill='%23cbd5e1'/%3E%3C/svg%3E`;
const AVATAR_FEMALE = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600' viewBox='0 0 400 600'%3E%3Crect width='400' height='600' fill='%234a1942'/%3E%3Ccircle cx='200' cy='200' r='85' fill='%23f9a8d4'/%3E%3Cellipse cx='200' cy='500' rx='170' ry='140' fill='%23f9a8d4'/%3E%3Ccircle cx='200' cy='200' r='70' fill='%23fce7f3'/%3E%3Cellipse cx='200' cy='480' rx='140' ry='120' fill='%23fce7f3'/%3E%3C/svg%3E`;

export default function ProfileCard({ profile, onLike, onPass, isAnimating }: ProfileCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Détecter le scroll manuel pour mettre à jour l'icône
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollTop = scrollContainerRef.current.scrollTop;
      const threshold = 100; // Seuil pour considérer qu'on est dans les infos
      setIsInfoVisible(scrollTop > threshold);
    }
  };

  // ✅ GARDE LA LOGIQUE DES BADGES PREMIUM
  const getTierStyling = () => {
    switch (profile.premiumTier) {
      case 'essentiel':
        return {
          gradient: 'from-amber-600 to-orange-700',
          icon: Star,
          label: 'Essentiel',
        };
      case 'elite':
        return {
          gradient: 'from-yellow-500 to-amber-600',
          icon: Crown,
          label: 'Élite',
        };
      case 'prestige':
        return {
          gradient: 'from-slate-400 to-slate-600',
          icon: Sparkles,
          label: 'Prestige',
        };
      case 'prestige-femme':
        return {
          gradient: 'from-pink-400 to-rose-500',
          icon: Sparkles,
          label: 'Prestige Femme',
        };
      default:
        return null;
    }
  };

  const tierStyling = getTierStyling();

  const nextImage = () => {
    if (currentImageIndex < displayImages.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Fonction pour scroller vers les infos (toggle)
  const scrollToInfo = () => {
    if (scrollContainerRef.current) {
      if (isInfoVisible) {
        // Remonter vers le haut (la photo)
        scrollContainerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } else {
        // Descendre vers les infos (après la photo)
        const screenHeight = window.innerHeight;
        scrollContainerRef.current.scrollTo({
          top: screenHeight - 100, // Scroll juste en dessous de la photo
          behavior: 'smooth'
        });
      }
    }
  };

  const defaultAvatar = profile.gender === 'femme' ? AVATAR_FEMALE : AVATAR_MALE;
  const displayImages = profile.image.length > 0 ? profile.image : [defaultAvatar];

  return (
    <div
      className={`relative w-full mx-auto transition-all duration-300 ${
        isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}
      style={{
        maxWidth: '500px',
        height: '100%',
        minHeight: '0',
      }}
    >
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative w-full h-full rounded-3xl shadow-2xl bg-white dark:bg-slate-900 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden"
        style={{
          touchAction: 'pan-y',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        
        {/* SECTION PHOTO */}
        <div 
          className="relative w-full min-h-screen bg-slate-900 dark:bg-slate-950 select-none flex-shrink-0 flex items-center justify-center"
          style={{
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          <img
            src={brokenImages.has(currentImageIndex) || !profile.image[currentImageIndex]
              ? (profile.gender === 'femme' ? AVATAR_FEMALE : AVATAR_MALE)
              : profile.image[currentImageIndex]}
            alt={profile.name}
            className="w-full h-full absolute inset-0"
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
            }}
            onError={() => setBrokenImages(prev => new Set(prev).add(currentImageIndex))}
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Tirets indicateurs en haut */}
          {profile.image.length > 1 && (
            <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-30">
              {profile.image.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  style={{ touchAction: 'auto' }}
                  className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                    index === currentImageIndex
                      ? 'bg-white shadow-sm'
                      : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Flèches de navigation visibles */}
          {profile.image.length > 1 && (
            <>
              {currentImageIndex > 0 && (
                <button
                  onClick={prevImage}
                  style={{ touchAction: 'auto' }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors active:scale-90"
                  aria-label="Photo précédente"
                >
                  <span className="text-lg font-bold leading-none">‹</span>
                </button>
              )}
              {currentImageIndex < profile.image.length - 1 && (
                <button
                  onClick={nextImage}
                  style={{ touchAction: 'auto' }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors active:scale-90"
                  aria-label="Photo suivante"
                >
                  <span className="text-lg font-bold leading-none">›</span>
                </button>
              )}
            </>
          )}

          {/* ✅ BADGE PREMIUM COLORÉ - VISIBLE */}
          {tierStyling && (
            <div className="absolute top-20 left-4 z-20">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-md rounded-full bg-gradient-to-r ${tierStyling.gradient}`}
              >
                <tierStyling.icon className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">
                  {tierStyling.label}
                </span>
              </div>
            </div>
          )}

          {/* Nom et âge */}
          <div 
            className="absolute left-4 right-16 z-10"
            style={{
              bottom: 'calc(env(safe-area-inset-bottom) + 200px)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-white text-2xl sm:text-3xl font-bold drop-shadow-lg">
                {profile.name}{profile.age > 0 ? `, ${profile.age}` : ''}
              </h2>
              {/* ✅ BADGE BLEU VÉRIFIÉ - VISIBLE */}
              {profile.premiumTier && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-white/90">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">{profile.location}{profile.distance > 0 ? ` • À ${profile.distance} km` : ''}</span>
            </div>
          </div>

          {/* Bouton info bleu - Toggle scroll */}
          <button
            onClick={scrollToInfo}
            className="absolute right-4 z-20 w-12 h-12 bg-blue-500 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
            style={{ 
              touchAction: 'auto',
              bottom: 'calc(env(safe-area-inset-bottom) + 120px)',
            }}
            aria-label={isInfoVisible ? "Retour en haut" : "Voir les informations"}
          >
            {isInfoVisible ? (
              <span className="text-white text-xl font-bold">↑</span>
            ) : (
              <span className="text-white text-xl font-bold">ℹ️</span>
            )}
          </button>
        </div>

        {/* SECTION INFORMATIONS - Scrollable avec pb-32 */}
        <div className="bg-white dark:bg-slate-900 p-6 space-y-6 pb-32">
          {/* Badge compatibilité */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 rounded-full">
              <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400 fill-rose-600 dark:fill-rose-400" />
              <span className="text-rose-700 dark:text-rose-400 font-semibold text-sm">
                {profile.compatibility}% compatible
              </span>
            </div>
          </div>

          {/* Bio - REMONTÉE ICI */}
          {profile.bio && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-500" />
                À propos
              </h3>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Localisation */}
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <MapPin className="w-5 h-5" />
            <span className="text-base">{profile.location}{profile.distance > 0 ? ` • À ${profile.distance} km` : ''}</span>
          </div>

          {/* Informations */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Informations</h3>
            
            {profile.profession && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Profession</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{profile.profession}</p>
                </div>
              </div>
            )}

            {profile.education && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Études</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{profile.education}</p>
                </div>
              </div>
            )}

            {profile.height > 0 && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <Ruler className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Taille</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{profile.height} cm</p>
                </div>
              </div>
            )}

            {profile.religion && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <span className="text-lg">🕌</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pratique religieuse</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{profile.religion}</p>
                </div>
              </div>
            )}
          </div>

          {/* Centres d'intérêt - pb-32 SUPPRIMÉ (déjà sur le parent) */}
          {profile.interests && profile.interests.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Centres d'intérêt</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-full text-sm font-medium"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ❌ PAS DE CADRE AVEC LES FONCTIONNALITÉS PREMIUM ICI */}
        </div>
      </div>

      {/* BOUTONS LIKE/PASS - cachés quand on scroll vers les infos */}
      <div
        className={`absolute left-0 right-0 flex justify-center items-center gap-4 sm:gap-6 px-4 sm:px-6 pointer-events-none z-50 transition-all duration-300 ${
          isInfoVisible ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'
        }`}
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 100px)',
        }}
      >
        <button
          onClick={onPass}
          style={{ touchAction: 'auto' }}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-white dark:bg-slate-800 rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-2 border-slate-200 dark:border-slate-700 pointer-events-auto"
          aria-label="Passer"
        >
          <X className="w-7 h-7 sm:w-8 sm:h-8 text-slate-600 dark:text-slate-400" />
        </button>

        <button
          onClick={onLike}
          style={{ touchAction: 'auto' }}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all pointer-events-auto"
          aria-label="Aimer"
        >
          <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white" />
        </button>
      </div>
    </div>
  );
}