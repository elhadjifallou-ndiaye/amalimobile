import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types pour l'authentification
export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
    phone?: string;
  };
}

// Fonctions d'authentification
export const authService = {
  // Inscription
  async signUp(email: string, password: string, metadata?: { name?: string; phone?: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  },

  // Connexion
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Connexion avec téléphone (OTP)
  async signInWithPhone(phone: string) {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { data, error };
  },

  // Vérifier l'OTP
  async verifyOtp(phone: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    return { data, error };
  },

  // Déconnexion
  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Obtenir l'utilisateur actuel
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Écouter les changements d'authentification
  onAuthStateChange(callback: (user: AuthUser | null, event: string) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user as AuthUser | null, event);
    });
  },

  // Réinitialiser le mot de passe
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  },

  // Mettre à jour le profil
  async updateProfile(updates: { name?: string; phone?: string; location?: string; bio?: string }) {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });
    return { data, error };
  },
};
