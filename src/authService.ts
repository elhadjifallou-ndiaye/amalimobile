import { supabase }  from '@/lib/supabase';
// ❌ Google Auth temporairement désactivé
// import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
// ❌ Apple Auth temporairement désactivé
// import { SignInWithApple } from '@capacitor-community/apple-sign-in';
//import { Capacitor } from '@capacitor/core';

export interface AuthResponse {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
}

class AuthService {
  constructor() {
    // ❌ Google Auth init désactivé temporairement
    // if (Capacitor.isNativePlatform()) {
    //   GoogleAuth.initialize({
    //     clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    //     scopes: ['profile', 'email'],
    //     grantOfflineAccess: true,
    //   });
    // }
  }

  // ===== CONNEXION EMAIL/PASSWORD =====
  async loginWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: this.translateError(error.message) };
      }

      return { success: true, user: data.user, session: data.session };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===== INSCRIPTION EMAIL/PASSWORD =====
  async registerWithEmail(email: string, password: string, metadata?: any): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        }
      });

      if (error) {
        return { success: false, error: this.translateError(error.message) };
      }

      return { 
        success: true, 
        user: data.user, 
        session: data.session,
        error: data.user?.identities?.length === 0 
          ? 'Cet email est déjà utilisé' 
          : undefined
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===== CONNEXION GOOGLE (DÉSACTIVÉ TEMPORAIREMENT) =====
  async loginWithGoogle(): Promise<AuthResponse> {
    return { 
      success: false, 
      error: 'Connexion Google temporairement indisponible. Utilisez Email/Password.' 
    };
    
    // ❌ Code Google Auth commenté
    // try {
    //   if (!Capacitor.isNativePlatform()) {
    //     // Web: utiliser OAuth flow de Supabase
    //     const { error } = await supabase.auth.signInWithOAuth({
    //       provider: 'google',
    //       options: {
    //         redirectTo: window.location.origin,
    //       }
    //     });

    //     if (error) {
    //       return { success: false, error: this.translateError(error.message) };
    //     }

    //     return { success: true };
    //   }

    //   // Mobile: utiliser le plugin Capacitor
    //   const googleUser = await GoogleAuth.signIn();

    //   if (!googleUser) {
    //     return { success: false, error: 'Connexion Google annulée' };
    //   }

    //   // Authentifier avec Supabase en utilisant le token Google
    //   const { data, error } = await supabase.auth.signInWithIdToken({
    //     provider: 'google',
    //     token: googleUser.authentication.idToken,
    //   });

    //   if (error) {
    //     return { success: false, error: this.translateError(error.message) };
    //   }

    //   return { success: true, user: data.user, session: data.session };
    // } catch (error: any) {
    //   console.error('Google Auth Error:', error);
    //   return { success: false, error: error.message };
    // }
  }

  // ===== CONNEXION APPLE (DÉSACTIVÉ TEMPORAIREMENT) =====
  async loginWithApple(): Promise<AuthResponse> {
    return { 
      success: false, 
      error: 'Connexion Apple temporairement indisponible. Utilisez Email/Password.' 
    };
    
    // ❌ Code Apple Auth commenté temporairement
    // try {
    //   if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    //     return { success: false, error: 'Apple Sign-In disponible uniquement sur iOS' };
    //   }

    //   // Générer un nonce aléatoire
    //   const rawNonce = this.generateNonce(32);
    //   
    //   // Hasher le nonce en SHA-256
    //   const hashedNonce = await this.sha256(rawNonce);

    //   console.log('Apple Sign-In: Starting with nonce');

    //   const result = await SignInWithApple.authorize({
    //     clientId: 'com.amali.love',  // ⚠️ Votre Bundle ID exact
    //     redirectURI: 'https://coytzhvhksalobmdnzwr.supabase.co/auth/v1/callback',
    //     scopes: 'email name',
    //     state: rawNonce,
    //     nonce: hashedNonce,  // Nonce hashé pour Apple
    //   });

    //   console.log('Apple Sign-In: Got response from Apple');

    //   if (!result.response.identityToken) {
    //     return { success: false, error: 'Pas de token reçu d\'Apple' };
    //   }

    //   // Authentifier avec Supabase en utilisant le nonce RAW (non-hashé)
    //   const { data, error } = await supabase.auth.signInWithIdToken({
    //     provider: 'apple',
    //     token: result.response.identityToken,
    //     nonce: rawNonce,  // ⚠️ Important : le nonce ORIGINAL (pas hashé)
    //   });

    //   if (error) {
    //     console.error('Supabase Apple Auth Error:', error);
    //     return { success: false, error: this.translateError(error.message) };
    //   }

    //   console.log('Apple Sign-In: Success!');
    //   return { success: true, user: data.user, session: data.session };
    // } catch (error: any) {
    //   console.error('Apple Auth Error:', error);
    //   return { 
    //     success: false, 
    //     error: error.message || 'Erreur lors de la connexion Apple. Veuillez réessayer.' 
    //   };
    // }
  }

  // ===== CONNEXION PAR TÉLÉPHONE - ÉTAPE 1: ENVOYER CODE =====
  async sendPhoneCode(phone: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        return { success: false, error: this.translateError(error.message) };
      }

      return { success: true, user: { phone } };
    } catch (error: any) {
      console.error('Phone Auth Error:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== CONNEXION PAR TÉLÉPHONE - ÉTAPE 2: VÉRIFIER CODE =====
  async verifyPhoneCode(phone: string, token: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });

      if (error) {
        return { success: false, error: this.translateError(error.message) };
      }

      return { success: true, user: data.user, session: data.session };
    } catch (error: any) {
      console.error('Phone Verification Error:', error);
      return { success: false, error: 'Code invalide' };
    }
  }

  // ===== MOT DE PASSE OUBLIÉ =====
  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, error: this.translateError(error.message) };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===== RÉCUPÉRER LA SESSION ACTUELLE =====
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  // ===== RÉCUPÉRER L'UTILISATEUR ACTUEL =====
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // ===== DÉCONNEXION =====
  async logout(): Promise<void> {
    await supabase.auth.signOut();
    
    // ❌ Google Sign Out désactivé
    // if (Capacitor.isNativePlatform()) {
    //   try {
    //     await GoogleAuth.signOut();
    //   } catch (e) {
    //     console.log('Google sign out error:', e);
    //   }
    // }
  }

  // ===== ÉCOUTER LES CHANGEMENTS D'AUTHENTIFICATION =====
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // ===== GÉNÉRER UN NONCE ALÉATOIRE (pour Apple Sign-In) =====
  // private generateNonce(length: number = 32): string {
  //   const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._';
  //   let result = '';
  //   const randomValues = new Uint8Array(length);
  //   crypto.getRandomValues(randomValues);
  //   
  //   randomValues.forEach((value) => {
  //     result += charset[value % charset.length];
  //   });
  //   
  //   return result;
  // }

  // ===== HASHER EN SHA-256 (pour Apple Sign-In) =====
  // private async sha256(plain: string): Promise<string> {
  //   const encoder = new TextEncoder();
  //   const data = encoder.encode(plain);
  //   const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  //   const hashArray = Array.from(new Uint8Array(hashBuffer));
  //   const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  //   return hashHex;
  // }

  // ===== TRADUCTION DES ERREURS =====
  private translateError(error: string): string {
    const errorMap: { [key: string]: string } = {
      'Invalid login credentials': 'Email ou mot de passe incorrect',
      'Email not confirmed': 'Veuillez confirmer votre email',
      'User already registered': 'Cet email est déjà utilisé',
      'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caractères',
      'Unable to validate email address': 'Email invalide',
      'Email rate limit exceeded': 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.',
      'Phone number already registered': 'Ce numéro est déjà utilisé',
      'Signups not allowed for this instance': 'Les inscriptions sont temporairement désactivées',
      'Invalid phone number format': 'Format de numéro de téléphone invalide',
    };

    const lower = error.toLowerCase();
    if (lower.includes('rate limit') || lower.includes('rate_limit')) {
      return 'Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.';
    }

    return errorMap[error] || error;
  }
}

export default new AuthService();