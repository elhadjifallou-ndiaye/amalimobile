import { useState, useEffect } from 'react';
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import authService from '@/authService';
import logoAmali from '@/assets/logoamali.png';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot' | 'confirm_email';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const DISPOSABLE_DOMAINS = ['mailinator.com','guerrillamail.com','temp-mail.org','throwam.com','yopmail.com','trashmail.com','fakeinbox.com','sharklasers.com','10minutemail.com','tempmail.com'];

function isValidEmail(email: string): boolean {
  if (!EMAIL_REGEX.test(email)) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  if (DISPOSABLE_DOMAINS.includes(domain)) return false;
  return true;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    authService.getSession().then(session => {
      if (session) onAuthenticated();
    });
  }, []);

  const reset = () => {
    setEmail(''); setPassword(''); setName('');
    setConfirmPassword(''); setError(''); setSuccess('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const result = await authService.loginWithEmail(email, password);
    if (result.success) {
      setSuccess('Connexion réussie !');
      setTimeout(() => onAuthenticated(), 800);
    } else {
      setError(result.error || 'Email ou mot de passe incorrect.');
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) { setError('Veuillez entrer une adresse email valide.'); return; }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setLoading(true); setError('');
    const result = await authService.registerWithEmail(email, password, { name });
    if (result.success) {
      setMode('confirm_email');
    } else {
      setError(result.error || 'Erreur lors de la création du compte.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const result = await authService.resetPassword(email);
    if (result.success) {
      setSuccess('Email envoyé ! Vérifiez votre boîte mail.');
      setTimeout(() => { setMode('signin'); reset(); }, 3000);
    } else {
      setError(result.error || 'Erreur lors de la réinitialisation.');
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 overflow-y-auto bg-white dark:bg-slate-900"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="min-h-full flex flex-col items-center justify-center px-5 py-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={logoAmali}
            alt="Amali"
            className="h-16 w-auto mb-3"
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
          <h1
            className="text-4xl font-bold"
            style={{
              fontFamily: "'Quicksand', 'Nunito', sans-serif",
              background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            amali
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {mode === 'signin' && 'Bon retour parmi nous'}
            {mode === 'signup' && 'Créez votre compte'}
            {mode === 'forgot' && 'Réinitialiser le mot de passe'}
            {mode === 'confirm_email' && 'Confirmation requise'}
          </p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm">

          {/* Alertes */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm">
              {success}
            </div>
          )}

          {/* ── CONNEXION ── */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <Field icon={<Mail className="w-5 h-5" />} label="Email">
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoFocus placeholder="votre@email.com"
                  className="input-base"
                />
              </Field>

              <Field icon={<Lock className="w-5 h-5" />} label="Mot de passe" action={
                <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }>
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  className="input-base"
                />
              </Field>

              <div className="flex justify-end">
                <button type="button" onClick={() => { setMode('forgot'); reset(); }}
                  className="text-sm text-rose-500 hover:text-rose-600 font-medium">
                  Mot de passe oublié ?
                </button>
              </div>

              <SubmitBtn loading={loading}>{loading ? 'Connexion...' : 'Se connecter'}</SubmitBtn>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-2">
                Pas encore de compte ?{' '}
                <button type="button" onClick={() => { setMode('signup'); reset(); }}
                  className="text-rose-500 hover:text-rose-600 font-semibold">
                  S'inscrire
                </button>
              </p>
            </form>
          )}

          {/* ── INSCRIPTION ── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <Field icon={<User className="w-5 h-5" />} label="Prénom">
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  required autoFocus placeholder="Votre prénom"
                  className="input-base"
                />
              </Field>

              <Field icon={<Mail className="w-5 h-5" />} label="Email">
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="votre@email.com"
                  className="input-base"
                />
              </Field>

              <Field icon={<Lock className="w-5 h-5" />} label="Mot de passe" action={
                <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }>
                <input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="Min. 6 caractères"
                  className="input-base"
                />
              </Field>

              <Field icon={<Lock className="w-5 h-5" />} label="Confirmer le mot de passe">
                <input
                  type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  required placeholder="••••••••"
                  className="input-base"
                />
              </Field>

              <SubmitBtn loading={loading}>{loading ? 'Création...' : 'Créer mon compte'}</SubmitBtn>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-2">
                Déjà un compte ?{' '}
                <button type="button" onClick={() => { setMode('signin'); reset(); }}
                  className="text-rose-500 hover:text-rose-600 font-semibold">
                  Se connecter
                </button>
              </p>
            </form>
          )}

          {/* ── MOT DE PASSE OUBLIÉ ── */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <button type="button" onClick={() => { setMode('signin'); reset(); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white mb-2">
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Entrez votre email et nous vous enverrons un lien de réinitialisation.
              </p>

              <Field icon={<Mail className="w-5 h-5" />} label="Email">
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoFocus placeholder="votre@email.com"
                  className="input-base"
                />
              </Field>

              <SubmitBtn loading={loading}>{loading ? 'Envoi...' : 'Envoyer le lien'}</SubmitBtn>
            </form>
          )}

          {/* ── CONFIRMATION EMAIL ── */}
          {mode === 'confirm_email' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Vérifiez votre email</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Un lien de confirmation a été envoyé à
              </p>
              <p className="text-sm font-semibold text-rose-500 mb-4">{email}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Cliquez sur le lien dans l'email pour activer votre compte. Vérifiez aussi vos spams.
              </p>
              <button
                onClick={() => { setMode('signin'); reset(); }}
                className="w-full py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-medium text-sm"
              >
                Retour à la connexion
              </button>
            </div>
          )}

          {/* Mentions légales */}
          <p className="text-center text-slate-400 dark:text-slate-600 text-xs mt-8 leading-relaxed">
            En continuant, vous acceptez nos{' '}
            <a href="https://www.amali.live/conditions-utilisation.html" target="_blank" rel="noopener noreferrer" className="text-rose-400 hover:underline">CGU</a>
            {' '}et notre{' '}
            <a href="https://www.amali.live/politique-confidentialite.html" target="_blank" rel="noopener noreferrer" className="text-rose-400 hover:underline">politique de confidentialité</a>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Composants internes ── */

function Field({ icon, label, children, action }: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-slate-400">{icon}</span>
        <div className="w-full [&_input]:w-full [&_input]:pl-10 [&_input]:pr-10 [&_input]:py-3 [&_input]:rounded-2xl [&_input]:border [&_input]:border-slate-300 dark:[&_input]:border-slate-600 [&_input]:bg-white dark:[&_input]:bg-slate-800 [&_input]:text-slate-900 dark:[&_input]:text-white [&_input]:text-sm [&_input]:outline-none [&_input:focus]:ring-2 [&_input:focus]:ring-rose-400 [&_input:focus]:border-transparent [&_input]:transition-all [&_input]:placeholder-slate-400">
          {children}
        </div>
        {action && <span className="absolute right-3.5">{action}</span>}
      </div>
    </div>
  );
}

function SubmitBtn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold text-sm hover:from-rose-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
    >
      {children}
    </button>
  );
}
