import { useState } from 'react';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  onComplete: () => void;
}

export default function ResetPasswordScreen({ onComplete }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      onComplete();
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 bg-white dark:bg-slate-900 flex flex-col items-center justify-center px-5"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nouveau mot de passe</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center">
          Choisissez un nouveau mot de passe sécurisé
        </p>
      </div>

      <div className="w-full max-w-sm">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Nouveau mot de passe
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
                placeholder="Min. 6 caractères"
                className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Confirmer le mot de passe
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold text-sm hover:from-rose-600 hover:to-amber-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                Enregistrer le mot de passe
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
