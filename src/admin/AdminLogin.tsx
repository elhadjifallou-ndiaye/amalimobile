import { useState } from 'react';
import { LogIn } from 'lucide-react';

const ADMIN_EMAIL = 'admin@amali.love';
const ADMIN_PASSWORD = 'Amali123';

interface AdminLoginProps {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', '1');
      onSuccess();
    } else {
      setError('Email ou mot de passe incorrect.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">
            amali
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Panneau d'administration</p>
        </div>

        <form onSubmit={handleLogin} className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-white font-semibold text-lg mb-1">Connexion</h2>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-slate-500"
              placeholder="admin@amali.love"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-slate-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all mt-2"
          >
            <LogIn className="w-4 h-4" />
            Se connecter
          </button>
        </form>

        <p className="text-center text-slate-700 text-xs mt-4">Accès restreint aux administrateurs</p>
      </div>
    </div>
  );
}
