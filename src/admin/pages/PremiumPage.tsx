import { Crown, Lock, CreditCard, BarChart3, Users, Zap } from 'lucide-react';

export default function PremiumPage() {
  const features = [
    { icon: Users, label: 'Gestion des abonnés', desc: 'Voir et gérer tous les utilisateurs premium' },
    { icon: CreditCard, label: 'Revenus & paiements', desc: 'Suivi des transactions et revenus mensuels' },
    { icon: BarChart3, label: 'Analytics premium', desc: 'Taux de conversion, churn, LTV' },
    { icon: Zap, label: 'Offres & promotions', desc: 'Créer et gérer les codes promo' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Premium</h1>
        <p className="text-slate-400 text-sm mt-1">Gestion des abonnements</p>
      </div>

      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-8 text-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Crown className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Module Premium</h2>
        <p className="text-slate-300 text-sm max-w-md mx-auto">
          Sera activé lors du lancement de l'offre premium.
        </p>
        <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 text-sm font-medium">
          <Lock className="w-3.5 h-3.5" />
          Disponible prochainement
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 opacity-50">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-300">{f.label}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{f.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
