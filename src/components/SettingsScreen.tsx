import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Users, Heart, Calendar, Sparkles, Shield, Bell, Moon, Save, Loader2 } from 'lucide-react';
import { supabase, authService } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';

interface SettingsScreenProps {
  onClose: () => void;
}

export default function SettingsScreen({ onClose }: SettingsScreenProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { isDarkMode, setDarkMode: setGlobalDarkMode } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');
  
  const [halalMode, setHalalMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  
  const [ageRange, setAgeRange] = useState([22, 35]);
  const [distance, setDistance] = useState(50);
  const [gender, setGender] = useState('femme');
  const [relationshipGoal, setRelationshipGoal] = useState('mariage');
  const [prayerLevel, setPrayerLevel] = useState('5-fois');

  useEffect(() => {
    loadSettings();
    
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    
    try {
      const { user } = await authService.getCurrentUser();
      if (!user) {
        console.error('❌ Utilisateur non connecté');
        return;
      }

      setUserId(user.id);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          halal_mode,
          notifications_enabled,
          dark_mode,
          age_preference_min,
          age_preference_max,
          distance_preference,
          looking_for_gender,
          relationship_goal,
          prayer_level_preference
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Erreur chargement paramètres:', error);
        return;
      }

      if (profile) {
        setHalalMode(profile.halal_mode ?? true);
        setNotifications(profile.notifications_enabled ?? true);
        
        setAgeRange([
          profile.age_preference_min ?? 22,
          profile.age_preference_max ?? 35
        ]);
        setDistance(profile.distance_preference ?? 50);
        setGender(profile.looking_for_gender ?? 'femme');
        setRelationshipGoal(profile.relationship_goal ?? 'mariage');
        setPrayerLevel(profile.prayer_level_preference ?? '5-fois');

        console.log('✅ Paramètres chargés:', profile);
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDarkModeToggle = (value: boolean) => {
    setGlobalDarkMode(value);
  };

  const handleSave = async () => {
    if (!userId) {
      alert('Erreur : utilisateur non connecté');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          halal_mode: halalMode,
          notifications_enabled: notifications,
          dark_mode: isDarkMode,
          
          age_preference_min: ageRange[0],
          age_preference_max: ageRange[1],
          distance_preference: distance,
          looking_for_gender: gender,
          relationship_goal: relationshipGoal,
          prayer_level_preference: prayerLevel,
          
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      alert('✅ Paramètres sauvegardés avec succès !');
      console.log('✅ Paramètres sauvegardés');
      
      onClose();
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde : ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col">
        <header
          className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-5"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)', paddingBottom: '1rem' }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Paramètres</h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Chargement des paramètres...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Header - Fixed */}
      <header
        className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-5"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)', paddingBottom: '1rem' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Paramètres</h1>
        </div>
      </header>

      {/* Content - Scrollable */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-5 py-6"
      >
        {/* Section: Préférences générales */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Préférences</h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
            <ToggleSetting
              icon={Shield}
              label="Mode Halal"
              description="Photos floutées et interactions respectueuses"
              enabled={halalMode}
              onToggle={setHalalMode}
              accent="emerald"
            />
            <ToggleSetting
              icon={Bell}
              label="Notifications"
              description="Recevoir des alertes pour les nouveaux matchs"
              enabled={notifications}
              onToggle={setNotifications}
            />
            <ToggleSetting
              icon={Moon}
              label="Mode sombre"
              description="Interface sombre pour économiser la batterie"
              enabled={isDarkMode}
              onToggle={handleDarkModeToggle}
            />
          </div>
        </div>

        {/* Section: Filtres de découverte */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Filtres de découverte</h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-6">
            {/* Tranche d'âge */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <label className="font-medium text-slate-900 dark:text-white">
                  Tranche d'âge: {ageRange[0]} - {ageRange[1]} ans
                </label>
              </div>
              <div className="space-y-2">
                <input
                  type="range"
                  min="18"
                  max="65"
                  value={ageRange[0]}
                  onChange={(e) => setAgeRange([parseInt(e.target.value), ageRange[1]])}
                  className="w-full accent-rose-500"
                />
                <input
                  type="range"
                  min="18"
                  max="65"
                  value={ageRange[1]}
                  onChange={(e) => setAgeRange([ageRange[0], parseInt(e.target.value)])}
                  className="w-full accent-rose-500"
                />
              </div>
            </div>

            {/* Distance */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <label className="font-medium text-slate-900 dark:text-white">
                  Distance maximale: {distance} km
                </label>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={distance}
                onChange={(e) => setDistance(parseInt(e.target.value))}
                className="w-full accent-rose-500"
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>5 km</span>
                <span>100 km</span>
              </div>
            </div>

            {/* Genre recherché */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <label className="font-medium text-slate-900 dark:text-white">Je recherche</label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setGender('femme')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                    gender === 'femme'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  Des femmes
                </button>
                <button
                  onClick={() => setGender('homme')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                    gender === 'homme'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  Des hommes
                </button>
              </div>
            </div>

            {/* Objectif de relation */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <label className="font-medium text-slate-900 dark:text-white">Objectif</label>
              </div>
              <select 
                value={relationshipGoal}
                onChange={(e) => setRelationshipGoal(e.target.value)}
                className="w-full py-3 px-4 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              >
                <option value="mariage">Mariage</option>
                <option value="relation-serieuse">Relation sérieuse</option>
                <option value="amitie">Amitié</option>
              </select>
            </div>

            {/* Niveau de prière */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <label className="font-medium text-slate-900 dark:text-white">Niveau de prière minimum</label>
              </div>
              <select 
                value={prayerLevel}
                onChange={(e) => setPrayerLevel(e.target.value)}
                className="w-full py-3 px-4 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              >
                <option value="5-fois">5 fois par jour</option>
                <option value="regulier">Régulièrement</option>
                <option value="occasionnel">Occasionnellement</option>
                <option value="peu-importe">Peu importe</option>
              </select>
            </div>
          </div>
        </div>

        {/* Boutons d'action - PADDING AUGMENTÉ */}
        <div className="space-y-3 pb-32">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-xl font-semibold hover:from-rose-600 hover:to-amber-600 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Enregistrer les paramètres
              </>
            )}
          </button>
          <button 
            onClick={onClose}
            disabled={saving}
            className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant Toggle Switch
interface ToggleSettingProps {
  icon: React.ElementType;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  accent?: 'emerald' | 'primary';
}

function ToggleSetting({ icon: Icon, label, description, enabled, onToggle, accent = 'primary' }: ToggleSettingProps) {
  const accentColor = accent === 'emerald' ? 'bg-emerald-600' : 'bg-rose-500';
  
  return (
    <div className="flex items-start gap-4 p-4">
      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
        <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-slate-900 dark:text-white mb-1">{label}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 mt-1 ${
          enabled ? accentColor : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}