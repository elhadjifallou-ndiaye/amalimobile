import { useState, useEffect } from 'react';
import { Heart, Mail, Lock, User, Phone, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import authService from '@/authService';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+221');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const session = await authService.getSession();
    if (session) {
      onAuthenticated();
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('+221');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authService.loginWithEmail(email, password);
      
      if (result.success) {
        setSuccess('Connexion réussie !');
        setTimeout(() => onAuthenticated(), 1000);
      } else {
        setError(result.error || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      const result = await authService.registerWithEmail(email, password, { 
        name, 
        phone: phone !== '+221' ? phone : undefined 
      });
      
      if (result.success) {
        setSuccess('Compte créé avec succès ! Vérifiez votre email.');
        setTimeout(() => {
          setMode('signin');
          resetForm();
        }, 2000);
      } else {
        setError(result.error || 'Erreur lors de la création du compte');
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authService.resetPassword(email);
      
      if (result.success) {
        setSuccess('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
        setTimeout(() => {
          setMode('signin');
          resetForm();
        }, 3000);
      } else {
        setError(result.error || 'Erreur lors de la réinitialisation');
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // ❌ Google Auth et Apple Auth temporairement désactivés
  // const handleAppleAuth = async () => {
  //   setLoading(true);
  //   setError('');

  //   try {
  //     const result = await authService.loginWithApple();
  //     if (result.success) {
  //       setSuccess('Connexion Apple réussie !');
  //       setTimeout(() => onAuthenticated(), 1000);
  //     } else {
  //       setError(result.error || 'Erreur de connexion Apple');
  //     }
  //   } catch (err: any) {
  //     setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-rose-50 via-white to-amber-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className="max-w-md w-full">
          {/* En-tête avec logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full mb-4 shadow-lg">
              <Heart className="w-10 h-10 text-white fill-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Amali</h1>
            <p className="text-slate-600">
              {mode === 'signin' && 'Connectez-vous pour rencontrer votre moitié'}
              {mode === 'signup' && 'Créez votre compte et trouvez l\'amour'}
              {mode === 'forgot' && 'Réinitialisez votre mot de passe'}
            </p>
          </div>

          {/* Carte principale */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
            {/* Messages d'erreur et succès */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-emerald-600 text-sm">{success}</p>
              </div>
            )}

            {/* Formulaire de connexion */}
            {mode === 'signin' && (
              <>
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                        placeholder="votre@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-12 pr-12 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      resetForm();
                    }}
                    className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                  >
                    Mot de passe oublié ?
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </button>
                </form>

                {/* ❌ Boutons OAuth temporairement retirés */}
                {/* <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-slate-500">Ou continuer avec</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleAppleAuth}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-black text-white rounded-2xl hover:bg-slate-900 transition-all disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    <span className="font-medium">Apple</span>
                  </button>
                </div> */}
              </>
            )}

            {/* Formulaire d'inscription */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom complet
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      placeholder="Votre nom"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Téléphone (optionnel)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      placeholder="+221 XX XXX XX XX"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-12 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Création...' : 'Créer mon compte'}
                </button>
              </form>
            )}

            {/* Formulaire mot de passe oublié */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    resetForm();
                  }}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Retour</span>
                </button>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Envoi...' : 'Réinitialiser le mot de passe'}
                </button>
              </form>
            )}

            {/* Liens de basculement */}
            {mode === 'signin' && (
              <div className="mt-6 text-center">
                <p className="text-slate-600 text-sm">
                  Pas encore de compte ?{' '}
                  <button
                    onClick={() => {
                      setMode('signup');
                      resetForm();
                    }}
                    className="text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    Inscrivez-vous
                  </button>
                </p>
              </div>
            )}

            {mode === 'signup' && (
              <div className="mt-6 text-center">
                <p className="text-slate-600 text-sm">
                  Déjà un compte ?{' '}
                  <button
                    onClick={() => {
                      setMode('signin');
                      resetForm();
                    }}
                    className="text-rose-600 hover:text-rose-700 font-semibold"
                  >
                    Connectez-vous
                  </button>
                </p>
              </div>
            )}
          </div>

          {/* Mentions légales */}
          <p className="text-center text-slate-500 text-xs mt-6 px-4">
            En continuant, vous acceptez nos{' '}
            <a href="https://www.amali.live/conditions-utilisation.html" target="_blank" rel="noopener noreferrer" className="text-rose-600 hover:underline">
              conditions d'utilisation
            </a>
            {' '}et notre{' '}
            <a href="https://www.amali.live/politique-confidentialite.html" target="_blank" rel="noopener noreferrer" className="text-rose-600 hover:underline">
              politique de confidentialité
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}