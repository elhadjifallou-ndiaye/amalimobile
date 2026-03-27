import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Star, Upload, Save, Loader2, MapPin, User } from 'lucide-react';
import { supabase, AuthUser } from '@/lib/supabase';

const compressImage = (file: File): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_DIM = 1920;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
        else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Compression échouée')), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image invalide')); };
    img.src = objectUrl;
  });

interface EditProfileModalProps {
  user: AuthUser;
  onClose: () => void;
  onSave: () => void;
}

interface ProfilePhoto {
  url: string;
  file?: File;
  isNew?: boolean;
}


export default function EditProfileModal({ user, onClose, onSave }: EditProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

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
          if (locationText) setFormData(prev => ({ ...prev, location: locationText }));
        } catch { /* ignore */ }
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 8000 }
    );
  };
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: 'Dakar, Sénégal',
  });

  // Gestion des photos
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name, bio, location, photos, profile_photo_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setFormData({
          name: profile.name || '',
          bio: profile.bio || '',
          location: profile.location || 'Dakar, Sénégal',
        });

        // Charger les photos existantes
        if (profile.photos && Array.isArray(profile.photos)) {
          const loadedPhotos = profile.photos.map((url: string) => ({ url }));
          setPhotos(loadedPhotos);
          
          // Définir l'index de la photo principale
          if (profile.profile_photo_url) {
            const mainIndex = profile.photos.indexOf(profile.profile_photo_url);
            setMainPhotoIndex(mainIndex !== -1 ? mainIndex : 0);
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    }
  };

  // Ajouter une nouvelle photo
  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (photos.length + files.length > 6) {
      alert('Maximum 6 photos autorisées');
      return;
    }

    files.forEach(file => {
      // Vérifier le type
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image valide');
        return;
      }

      // Vérifier la taille (20MB max avant compression)
      if (file.size > 20 * 1024 * 1024) {
        alert('La taille de l\'image ne doit pas dépasser 20 MB');
        return;
      }

      // Créer une URL temporaire pour l'aperçu
      const url = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { url, file, isNew: true }]);
    });
  };

  // Supprimer une photo
  const handleDeletePhoto = (index: number) => {
    if (photos.length <= 1) {
      alert('Vous devez conserver au moins une photo de profil.');
      return;
    }
    const photo = photos[index];

    // Si c'est une photo existante (pas nouvelle), l'ajouter à la liste de suppression
    if (!photo.isNew && photo.url) {
      setPhotosToDelete(prev => [...prev, photo.url]);
    }

    // Révoquer l'URL si c'est une nouvelle photo
    if (photo.isNew && photo.url) {
      URL.revokeObjectURL(photo.url);
    }

    // Retirer la photo de la liste
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);

    // Ajuster l'index de la photo principale si nécessaire
    if (mainPhotoIndex === index) {
      setMainPhotoIndex(0);
    } else if (mainPhotoIndex > index) {
      setMainPhotoIndex(mainPhotoIndex - 1);
    }
  };

  // Définir comme photo principale
  const handleSetMainPhoto = (index: number) => {
    setMainPhotoIndex(index);
  };

  // Upload des nouvelles photos vers Supabase
  const uploadNewPhotos = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const photo of photos) {
      if (photo.isNew && photo.file) {
        const compressed = await compressImage(photo.file);
        const fileName = `${user.id}/photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(fileName, compressed, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      } else if (!photo.isNew) {
        // Garder les photos existantes
        uploadedUrls.push(photo.url);
      }
    }

    return uploadedUrls;
  };

  // Supprimer les photos du storage
  const deletePhotosFromStorage = async () => {
    if (photosToDelete.length === 0) return;

    const fileNames = photosToDelete.map(url => {
      const parts = url.split('/');
      const fileName = parts[parts.length - 1];
      return `${user.id}/${fileName}`;
    });

    await supabase.storage
      .from('profile-photos')
      .remove(fileNames);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Le prénom est obligatoire');
      return;
    }
    if (photos.length === 0) {
      alert('Vous devez avoir au moins une photo de profil.');
      return;
    }

    if (formData.bio.length > 200) {
      alert('La bio ne doit pas dépasser 200 caractères');
      return;
    }

    setLoading(true);

    try {
      // 1. Upload des nouvelles photos
      const photoUrls = await uploadNewPhotos();

      // 2. Supprimer les anciennes photos
      await deletePhotosFromStorage();

      // 3. Déterminer la photo principale
      const mainPhotoUrl = photoUrls[mainPhotoIndex] || null;

      // 4. Mettre à jour le profil dans Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          bio: formData.bio,
          location: formData.location,
          photos: photoUrls,
          profile_photo_url: mainPhotoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 5. Mettre à jour les métadonnées de l'utilisateur
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
          bio: formData.bio,
          location: formData.location,
        }
      });

      if (updateError) throw updateError;

      alert('Profil mis à jour avec succès ! ✨');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-white dark:bg-slate-900 z-[9999] flex flex-col">
      {/* Header */}
      <div
        className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-5 flex items-center justify-between"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: '1rem' }}
      >
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Modifier mon profil</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Section Photos */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Mes Photos ({photos.length}/6)
              </h3>
              <span className="text-sm text-slate-500">
                {photos.length > 0 && '⭐ = Photo principale'}
              </span>
            </div>

            {/* Grille de photos */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square group">
                  <img
                    src={photo.url}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-2xl bg-slate-100"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                      if (placeholder) placeholder.style.display = 'flex';
                    }}
                  />
                  <div
                    className="w-full h-full rounded-2xl bg-slate-100 items-center justify-center flex-col gap-1 hidden absolute inset-0"
                  >
                    <User className="w-8 h-8 text-slate-300" />
                    <span className="text-xs text-slate-400">Photo invalide</span>
                    <button
                      onClick={() => handleDeletePhoto(index)}
                      className="mt-1 text-xs text-red-400 underline"
                    >
                      Supprimer
                    </button>
                  </div>
                  
                  {/* Badge photo principale */}
                  {mainPhotoIndex === index && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500 text-white text-xs rounded-full font-medium flex items-center gap-1">
                      <Star className="w-3 h-3 fill-white" />
                      Principale
                    </div>
                  )}

                  {/* Actions (visibles au survol) */}
                  <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {mainPhotoIndex !== index && (
                      <button
                        onClick={() => handleSetMainPhoto(index)}
                        className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full transition-colors"
                        title="Définir comme principale"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePhoto(index)}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Bouton Ajouter une photo */}
              {photos.length < 6 && (
                <label className="aspect-square border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-rose-500 hover:bg-rose-50 transition-all">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs text-slate-500 text-center px-2">
                    Ajouter
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleAddPhoto}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              )}
            </div>

            {/* Conseils */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-blue-700 text-sm">
                💡 <strong>Conseils :</strong>
              </p>
              <ul className="text-blue-600 text-xs mt-2 space-y-1 ml-4">
                <li>• Ajoutez jusqu'à 6 photos de qualité</li>
                <li>• La première photo (⭐) sera votre photo principale</li>
                <li>• Cliquez sur ⭐ pour changer la photo principale</li>
                <li>• Maximum 5 MB par photo</li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200"></div>

          {/* Section Informations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Informations</h3>

            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prénom *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                placeholder="Votre prénom"
              />
            </div>

            {/* Localisation */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Localisation
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  placeholder="Ville, Pays"
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={gpsLoading}
                  className="px-3 border border-slate-300 rounded-2xl bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                  title="Détecter ma position"
                >
                  {gpsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                rows={4}
                maxLength={200}
                placeholder="Parlez de vous, vos centres d'intérêt..."
              />
              <p className="text-xs text-slate-500 mt-1 text-right">
                {formData.bio.length}/200
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer fixe — toujours visible au-dessus de la bottom nav */}
      <div
        className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-5 flex gap-3"
        style={{ paddingTop: '1rem', paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
      >
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-2xl text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold hover:from-rose-600 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer
              </>
            )}
          </button>
      </div>
    </div>,
    document.body
  );
}
