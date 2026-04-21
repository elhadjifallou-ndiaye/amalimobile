import React, { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, Upload, User, Heart, Sparkles, Users, MapPin, Loader2 } from 'lucide-react';
import { supabase, authService } from '@/lib/supabase';
import { trackCompleteRegistration } from '@/lib/pixel';
import { compressImage } from '@/lib/imageUtils';

interface ProfileData {
  name: string;
  dateOfBirth: string;
  gender: string;
  location: string;
  bio: string;
  profession: string;
  education: string;
  height: string;
  prayerFrequency: string;
  relationshipGoal: string;
  hijabPreference: string;
  polygamyStance: string;
  interests: string[];
  photos: File[];
}

interface ProfileCompletionProps {
  userId?: string;
  onComplete: () => void;
  onSkipForNow?: () => void;
}

export default function ProfileCompletion({ userId, onComplete, onSkipForNow }: ProfileCompletionProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('profile_photo_url, name, date_of_birth, gender, location, bio, profession, education_level, height, prayer_frequency, relationship_goal, hijab_wear, polygamy_stance, interests')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.profile_photo_url) setExistingPhotoUrl(data.profile_photo_url);
        setProfileData(prev => ({
          ...prev,
          name: data.name || prev.name,
          dateOfBirth: data.date_of_birth || prev.dateOfBirth,
          gender: data.gender && data.gender !== 'null' && data.gender !== 'undefined' ? data.gender : prev.gender,
          location: data.location || prev.location,
          bio: data.bio || prev.bio,
          profession: data.profession || prev.profession,
          education: data.education_level || prev.education,
          height: data.height ? String(data.height) : prev.height,
          prayerFrequency: data.prayer_frequency || prev.prayerFrequency,
          relationshipGoal: data.relationship_goal || prev.relationshipGoal,
          hijabPreference: data.hijab_wear || prev.hijabPreference,
          polygamyStance: data.polygamy_stance || prev.polygamyStance,
          interests: Array.isArray(data.interests) && data.interests.length ? data.interests : prev.interests,
        }));
      });
  }, [userId]);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=fr`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
          const country = data.address?.country || '';
          const locationText = [city, country].filter(Boolean).join(', ');
          if (locationText) setProfileData(prev => ({ ...prev, location: locationText }));
        } catch { /* ignore */ }
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 8000 }
    );
  };
  
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    dateOfBirth: '',
    gender: '',
    location: 'Dakar, Sénégal',
    bio: '',
    profession: '',
    education: '',
    height: '',
    prayerFrequency: '',
    relationshipGoal: '',
    hijabPreference: '',
    polygamyStance: '',
    interests: [],
    photos: [],
  });

  const totalSteps = 5;

  const availableInterests = [
    'Lecture', 'Sport', 'Voyage', 'Cuisine', 'Art', 'Musique',
    'Cinéma', 'Nature', 'Tech', 'Mode', 'Photographie', 'Écriture'
  ];

  const educationLevels = [
    'Lycée', 'Bac', 'Bac+2', 'Licence', 'Master', 'Doctorat'
  ];

  const prayerFrequencies = [
    '5 fois par jour', 'Régulièrement', 'Occasionnellement', 'En apprentissage'
  ];

  const relationshipGoals = [
    'Mariage', 'Relation sérieuse menant au mariage', 'Apprendre à se connaître', 'Amitié'
  ];

  const hijabOptions = [
    'Oui', 'Non', 'Parfois', 'En réflexion'
  ];

  const polygamyOptions = [
    { value: 'accepte', label: "J'accepte" },
    { value: 'refuse', label: 'Je refuse' },
    { value: 'discuter', label: 'À discuter' }
  ];

  const toggleInterest = (interest: string) => {
    setProfileData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + profileData.photos.length > 6) {
      alert('Maximum 6 photos');
      return;
    }
    const oversized = files.filter(f => f.size > 20 * 1024 * 1024);
    if (oversized.length > 0) {
      alert('Certaines photos dépassent 20 MB et ne peuvent pas être ajoutées.');
      return;
    }
    setProfileData(prev => ({ ...prev, photos: [...prev.photos, ...files] }));
  };

  const removePhoto = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const canGoNext = () => {
    if (currentStep === 1) {
      return profileData.name.trim().length > 0 && profileData.dateOfBirth.length > 0 && profileData.gender.length > 0;
    }
    if (currentStep === 5) {
      return profileData.photos.length > 0 || !!existingPhotoUrl;
    }
    return true;
  };

  const handleNext = () => {
    if (canGoNext() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // Si on n'a pas encore de photo ET pas de photo existante, aller à l'étape 5
    if (profileData.photos.length === 0 && !existingPhotoUrl) {
      setCurrentStep(5);
      return;
    }
    // Sinon soumettre directement
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (!profileData.name.trim() || !profileData.dateOfBirth || !profileData.gender) {
      alert('Prénom, date de naissance et genre sont obligatoires.');
      return;
    }
    if (profileData.photos.length === 0 && !existingPhotoUrl) {
      setCurrentStep(5);
      return;
    }

    setLoading(true);

    try {
      const { user } = await authService.getCurrentUser();
      if (!user) {
        alert('Erreur : utilisateur non connecté');
        return;
      }

      setUploadingPhotos(true);
      const photoUrls: string[] = [];
      
      if (profileData.photos.length > 0) {
        for (const photo of profileData.photos) {
          const compressed = await compressImage(photo);
          const fileName = `${user.id}/photo_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from('profile-photos')
            .upload(fileName, compressed, { contentType: 'image/jpeg', cacheControl: '31536000' });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('profile-photos')
            .getPublicUrl(fileName);

          photoUrls.push(urlData.publicUrl);
        }
      }

      setUploadingPhotos(false);

      const updateData: any = {
        name: profileData.name,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };

      if (profileData.dateOfBirth) updateData.date_of_birth = profileData.dateOfBirth;
      if (profileData.gender) updateData.gender = profileData.gender;
      if (profileData.location) updateData.location = profileData.location;
      if (profileData.bio) updateData.bio = profileData.bio;
      if (profileData.profession) updateData.profession = profileData.profession;
      if (profileData.education) updateData.education_level = profileData.education;
      if (profileData.height) updateData.height = parseInt(profileData.height);
      if (profileData.prayerFrequency) updateData.prayer_frequency = profileData.prayerFrequency;
      if (profileData.relationshipGoal) updateData.relationship_goal = profileData.relationshipGoal;
      if (profileData.hijabPreference) updateData.hijab_wear = profileData.hijabPreference;
      if (profileData.polygamyStance) updateData.polygamy_stance = profileData.polygamyStance;
      if (profileData.interests.length > 0) updateData.interests = profileData.interests;
      if (photoUrls.length > 0) {
        updateData.profile_photo_url = photoUrls[0];
        updateData.photos = photoUrls;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, email: user.email ?? '', ...updateData });

      if (updateError) throw updateError;
      
      trackCompleteRegistration();
      setTimeout(() => {
        onComplete();
      }, 500);

    } catch (error: any) {
      alert('Erreur lors de la sauvegarde : ' + error.message);
    } finally {
      setLoading(false);
      setUploadingPhotos(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gradient-to-b from-rose-50 to-amber-50 dark:from-slate-900 dark:to-slate-800 flex flex-col"
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Header - Fixed */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 shadow-sm px-5 py-4 flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        
        <div className="flex-1 mx-4">
          <div className="flex items-center gap-1">
            {[...Array(totalSteps)].map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  index < currentStep
                    ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-2">
            Étape {currentStep}/{totalSteps}{currentStep === 1 || currentStep === 5 ? ' *obligatoire' : ' (optionnel)'}
          </p>
        </div>

        {currentStep > 1 && currentStep < 5 ? (
          <button
            onClick={handleSkip}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-all"
          >
            {profileData.photos.length === 0 ? 'Ajouter une photo →' : 'Passer'}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Content - Scrollable */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        <div className="px-5 py-6">
          <div className="w-full max-w-lg mx-auto">
        
        {/* Step 1: Informations de base */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Bienvenue !</h2>
              <p className="text-slate-600 dark:text-slate-400">Remplissez les informations essentielles</p>
              <p className="text-sm text-rose-500 dark:text-rose-400 mt-2">
                * Prénom, date de naissance, genre et photo sont obligatoires
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Prénom *</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                placeholder="Votre prénom"
                className="w-full px-4 py-3.5 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date de naissance *</label>
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">⚠️ Vous devez avoir au moins 18 ans pour utiliser Amali</p>
              <input
                type="date"
                value={profileData.dateOfBirth}
                onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                className="w-full px-4 py-3.5 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent accent-rose-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Votre genre *</label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Indiquez votre genre (pas celui que vous recherchez)</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProfileData({ ...profileData, gender: 'homme' })}
                  className={`px-4 py-3.5 rounded-2xl border-2 font-medium transition-all ${
                    profileData.gender === 'homme'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  Homme
                </button>
                <button
                  type="button"
                  onClick={() => setProfileData({ ...profileData, gender: 'femme' })}
                  className={`px-4 py-3.5 rounded-2xl border-2 font-medium transition-all ${
                    profileData.gender === 'femme'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  Femme
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Localisation (optionnel)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={profileData.location}
                  onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                  placeholder="Ville, Pays"
                  className="flex-1 px-4 py-3.5 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={gpsLoading}
                  className="px-3 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  title="Détecter ma position"
                >
                  {gpsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: À propos de vous */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">À propos de vous</h2>
              <p className="text-slate-600 dark:text-slate-400">Parlez-nous de votre parcours (optionnel)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bio (optionnel)</label>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Décrivez-vous en quelques phrases..."
                rows={4}
                className="w-full px-4 py-3.5 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Profession (optionnel)</label>
              <input
                type="text"
                value={profileData.profession}
                onChange={(e) => setProfileData({ ...profileData, profession: e.target.value })}
                placeholder="Ex: Ingénieur, Enseignant..."
                className="w-full px-4 py-3.5 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Niveau d'études (optionnel)</label>
              <div className="grid grid-cols-2 gap-3">
                {educationLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setProfileData({ ...profileData, education: level })}
                    className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                      profileData.education === level
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Taille (cm, optionnel)</label>
              <input
                type="number"
                value={profileData.height}
                onChange={(e) => setProfileData({ ...profileData, height: e.target.value })}
                placeholder="Ex: 175"
                className="w-full px-4 py-3.5 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Step 3: Vos valeurs */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Vos valeurs</h2>
              <p className="text-slate-600 dark:text-slate-400">Partagez vos priorités (optionnel)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Fréquence de prière (optionnel)</label>
              <div className="grid grid-cols-2 gap-3">
                {prayerFrequencies.map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setProfileData({ ...profileData, prayerFrequency: freq })}
                    className={`px-4 py-3 rounded-xl border-2 font-medium transition-all text-sm ${
                      profileData.prayerFrequency === freq
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Objectif relationnel (optionnel)</label>
              <div className="space-y-3">
                {relationshipGoals.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setProfileData({ ...profileData, relationshipGoal: goal })}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-medium transition-all text-left ${
                      profileData.relationshipGoal === goal
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            {profileData.gender === 'femme' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Port du hijab (optionnel)</label>
                <div className="grid grid-cols-2 gap-3">
                  {hijabOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setProfileData({ ...profileData, hijabPreference: option })}
                      className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                        profileData.hijabPreference === option
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                Position sur la polygamie (optionnel)
              </label>
              <div className="space-y-3">
                {polygamyOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setProfileData({ ...profileData, polygamyStance: option.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-medium transition-all text-left ${
                      profileData.polygamyStance === option.value
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Centres d'intérêt */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Vos passions</h2>
              <p className="text-slate-600 dark:text-slate-400">Sélectionnez vos centres d'intérêt (optionnel)</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {availableInterests.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-5 py-3 rounded-full font-medium transition-all ${
                    profileData.interests.includes(interest)
                      ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              {profileData.interests.length} sélectionné(s)
            </p>
          </div>
        )}

        {/* Step 5: Photos */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Votre photo</h2>
              <p className="text-slate-600 dark:text-slate-400">
                {existingPhotoUrl
                  ? 'Votre photo actuelle est conservée. Vous pouvez en ajouter une nouvelle.'
                  : <>Ajoutez au moins une photo <span className="text-rose-500 font-semibold">*</span> (max 6)</>}
              </p>
            </div>

            {existingPhotoUrl && profileData.photos.length === 0 && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">Photo actuelle</p>
                <img
                  src={existingPhotoUrl}
                  alt="Photo actuelle"
                  className="w-24 h-24 object-cover rounded-2xl border-2 border-rose-300"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {profileData.photos.map((photo, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {profileData.photos.length < 6 && (
                <label
                  htmlFor="profile-photo-input"
                  className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                >
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">Ajouter</span>
                </label>
              )}
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              {profileData.photos.length} photo(s) / max 6
            </p>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Input file via label — fiable sur iOS/Capacitor */}
      <input
        id="profile-photo-input"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePhotoUpload}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Footer - Fixed */}
      <div
        className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-5 pt-4 space-y-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)', position: 'relative' }}
      >
        {currentStep < totalSteps ? (
          <button
            onClick={handleNext}
            disabled={!canGoNext()}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold hover:from-rose-600 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-98 flex items-center justify-center gap-2"
          >
            Continuer
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canGoNext() || loading || uploadingPhotos}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-98 flex items-center justify-center gap-2"
          >
            {loading || uploadingPhotos ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {uploadingPhotos ? 'Upload photos...' : 'Enregistrement...'}
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Terminer
              </>
            )}
          </button>
        )}

        {currentStep > 1 && currentStep < 5 && (
          <button
            onClick={handleSkip}
            disabled={loading}
            className="w-full py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {profileData.photos.length === 0 ? "Ajouter une photo d'abord →" : 'Passer les étapes restantes'}
          </button>
        )}

        {currentStep === 1 && onSkipForNow && (
          <button
            onClick={onSkipForNow}
            className="w-full py-3 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
          >
            ← Retour à la connexion
          </button>
        )}
      </div>
    </div>
  );
}