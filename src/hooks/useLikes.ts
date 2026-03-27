import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface LikesData {
  likes_remaining: number;
  super_likes_remaining: number;
  rewind_remaining: number;
  last_reset: string;
  subscription_tier: 'free' | 'essentiel' | 'elite' | 'prestige' | 'prestige_femme';
  boost_active: boolean;
  boost_expires_at: string | null;
  streak_days: number;
  last_login: string;
}

interface LikesLimits {
  free: { likes: number; superLikes: number; rewind: number };
  essentiel: { likes: number; superLikes: number; rewind: number };
  elite: { likes: number; superLikes: number; rewind: number };
  prestige: { likes: number; superLikes: number; rewind: number };
  prestige_femme: { likes: number; superLikes: number; rewind: number };
}

const LIMITS: LikesLimits = {
  free: { likes: 30, superLikes: 1, rewind: 0 }, // ✅ 30 likes gratuits
  essentiel: { likes: 80, superLikes: 5, rewind: 0 },
  elite: { likes: 100, superLikes: 7, rewind: 3 },
  prestige: { likes: 999999, superLikes: 20, rewind: 999999 }, // Illimité
  prestige_femme: { likes: 999999, superLikes: 30, rewind: 0 }, // ✅ 30 super likes
};

export const useLikes = (userId: string) => {
  const [likesData, setLikesData] = useState<LikesData | null>(null);
  const [loading, setLoading] = useState(true);

  // Charger les données
  useEffect(() => {
    if (userId) {
      loadLikesData();
      checkDailyReset();
      checkLoginStreak();
    }
  }, [userId]);

  // Charger les données de likes
  const loadLikesData = async () => {
    try {
      const { data, error } = await supabase
        .from('user_likes')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Pas de données, créer l'entrée
        await createInitialData();
      } else if (data) {
        setLikesData(data);
      }
    } catch (error) {
      console.error('Erreur chargement likes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Créer les données initiales
  const createInitialData = async () => {
    const initialData: Partial<LikesData> = {
      likes_remaining: LIMITS.free.likes,
      super_likes_remaining: LIMITS.free.superLikes,
      rewind_remaining: 0,
      last_reset: new Date().toISOString(),
      subscription_tier: 'free',
      boost_active: false,
      boost_expires_at: null,
      streak_days: 1,
      last_login: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_likes')
      .insert({ user_id: userId, ...initialData })
      .select()
      .single();

    if (!error && data) {
      setLikesData(data);
    }
  };

  // Vérifier et reset quotidien
  const checkDailyReset = async () => {
    if (!likesData) return;

    const lastReset = new Date(likesData.last_reset);
    const now = new Date();

    // Reset à minuit
    const lastMidnight = new Date(now);
    lastMidnight.setHours(0, 0, 0, 0);

    if (lastReset < lastMidnight) {
      await resetDailyLikes();
    }
  };

  // Reset quotidien
  const resetDailyLikes = async () => {
    if (!likesData) return;

    const tier = likesData.subscription_tier;
    const limits = LIMITS[tier];

    const { data, error } = await supabase
      .from('user_likes')
      .update({
        likes_remaining: limits.likes,
        super_likes_remaining: limits.superLikes,
        rewind_remaining: limits.rewind,
        last_reset: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (!error && data) {
      setLikesData(data);
    }
  };

  // Vérifier streak de connexion
  const checkLoginStreak = async () => {
    if (!likesData) return;

    const lastLogin = new Date(likesData.last_login);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

    let newStreak = likesData.streak_days;
    let bonusLikes = 0;

    if (diffDays === 1) {
      // Connexion quotidienne continue
      newStreak += 1;
      bonusLikes = 5; // +5 likes bonus

      // Bonus de streak
      if (newStreak % 7 === 0) {
        bonusLikes += 10; // +10 likes pour 7 jours consécutifs
      }
    } else if (diffDays > 1) {
      // Streak cassé
      newStreak = 1;
    }

    if (bonusLikes > 0) {
      await supabase
        .from('user_likes')
        .update({
          likes_remaining: (likesData.likes_remaining || 0) + bonusLikes,
          streak_days: newStreak,
          last_login: now.toISOString(),
        })
        .eq('user_id', userId);

      // Notifier l'utilisateur
      alert(`🎁 Bonus connexion quotidienne : +${bonusLikes} likes !`);
      
      await loadLikesData();
    } else {
      await supabase
        .from('user_likes')
        .update({
          streak_days: newStreak,
          last_login: now.toISOString(),
        })
        .eq('user_id', userId);
    }
  };

  // Consommer un like normal
  // TODO: réactiver la logique premium quand le business sera configuré
  const consumeLike = async (): Promise<boolean> => {
    return true; // Likes illimités pour tous (mode beta)
  };

  // Consommer un super like
  const consumeSuperLike = async (): Promise<boolean> => {
    if (!likesData) return false;

    if (likesData.super_likes_remaining <= 0) {
      return false;
    }

    const { data, error } = await supabase
      .from('user_likes')
      .update({
        super_likes_remaining: likesData.super_likes_remaining - 1,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (!error && data) {
      setLikesData(data);
      return true;
    }

    return false;
  };

  // Consommer un rewind (annuler)
  const consumeRewind = async (): Promise<boolean> => {
    if (!likesData) return false;

    if (likesData.rewind_remaining <= 0) {
      return false;
    }

    const { data, error } = await supabase
      .from('user_likes')
      .update({
        rewind_remaining: likesData.rewind_remaining - 1,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (!error && data) {
      setLikesData(data);
      return true;
    }

    return false;
  };

  // Activer boost (30 min likes illimités)
  const activateBoost = async () => {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const { data, error } = await supabase
      .from('user_likes')
      .update({
        boost_active: true,
        boost_expires_at: expiresAt.toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (!error && data) {
      setLikesData(data);
    }
  };

  // Mettre à jour le tier d'abonnement
  const updateSubscriptionTier = async (tier: LikesData['subscription_tier']) => {
    const limits = LIMITS[tier];

    const { data, error } = await supabase
      .from('user_likes')
      .update({
        subscription_tier: tier,
        likes_remaining: limits.likes,
        super_likes_remaining: limits.superLikes,
        rewind_remaining: limits.rewind,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (!error && data) {
      setLikesData(data);
    }
  };

  // Vérifier si on peut liker
  // TODO: réactiver la logique premium quand le business sera configuré
  const canLike = (): boolean => {
    return true; // Likes illimités pour tous (mode beta)
  };

  // Vérifier si on peut super liker
  const canSuperLike = (): boolean => {
    if (!likesData) return false;
    return likesData.super_likes_remaining > 0;
  };

  // Vérifier si on peut annuler
  const canRewind = (): boolean => {
    if (!likesData) return false;
    return likesData.rewind_remaining > 0;
  };

  return {
    likesData,
    loading,
    consumeLike,
    consumeSuperLike,
    consumeRewind,
    activateBoost,
    updateSubscriptionTier,
    canLike,
    canSuperLike,
    canRewind,
    refreshData: loadLikesData,
  };
};