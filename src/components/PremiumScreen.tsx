import React from 'react';
import { ArrowLeft, Crown, Sparkles, Star, Eye, RotateCcw, TrendingUp, Video, Shield, Clock } from 'lucide-react';

interface PremiumScreenProps {
  onClose: () => void;
}

export default function PremiumScreen({ onClose }: PremiumScreenProps) {
  const plans = [
    {
      id: 'amaliessentielv2',
      name: 'Essentiel',
      price: '2 900',
      period: 'mois',
      color: 'from-amber-600 to-orange-700',
      borderColor: 'border-amber-500',
      bgColor: 'bg-amber-50',
      icon: Star,
      features: [
        '80 likes par jour',
        '5 super likes par jour',
        'Profil mis en avant',
      ],
    },
    {
      id: 'amalielitev2',
      name: 'Élite',
      price: '4 900',
      period: 'mois',
      color: 'from-yellow-500 to-amber-600',
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-50',
      icon: Crown,
      popular: true,
      features: [
        '100 likes par jour',
        '7 super likes par jour',
        'Voir qui vous a aimé',
        'Annuler un swipe',
        'Visibilité accrue',
      ],
    },
    {
      id: 'amaliprestigev2',
      name: 'Prestige',
      price: '7 900',
      period: 'mois',
      color: 'from-slate-400 to-slate-600',
      borderColor: 'border-slate-400',
      bgColor: 'bg-slate-50',
      icon: Sparkles,
      features: [
        'Likes illimités',
        '20 super likes par jour',
        'Appels vidéo',
        'Voir qui vous a aimé',
        'Annuler un swipe',
        'Visibilité maximale',
        'Statistiques de popularité',
      ],
    },
    {
      id: 'amaliprestigefemmev2',
      name: 'Prestige Femme',
      price: '2 000',
      period: 'mois',
      color: 'from-pink-400 to-rose-500',
      borderColor: 'border-pink-400',
      bgColor: 'bg-pink-50',
      icon: Sparkles,
      forWomenOnly: true,
      special: 'Offre spéciale femmes',
      features: [
        'Likes illimités',
        '30 super likes par jour',
        'Voir qui vous a aimé',
        'Annuler un match',
        'Priorité modérée',
        'Sécurité renforcée',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex flex-col">
      {/* Header - Fixed */}
      <header className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-5 py-4">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Premium AMALI</h1>
        </div>
      </header>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Améliorez votre expérience</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Découvrez nos offres Premium pour trouver votre match idéal plus rapidement
          </p>
        </div>

        {/* Message Coming Soon */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-3xl p-6 mb-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-300 mb-2">
              Bientôt disponible ! 🎉
            </h3>
            <p className="text-blue-700 dark:text-blue-400 mb-4">
              Les abonnements Premium seront disponibles très prochainement. En attendant, profitez gratuitement de toutes les fonctionnalités de base !
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Lancement imminent</span>
            </div>
          </div>
        </div>

        {/* Avantages Premium à venir */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 text-center">
            Ce qui vous attend avec Premium
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-8">
            <BenefitCard icon={Eye} text="Voir qui vous aime" />
            <BenefitCard icon={RotateCcw} text="Annuler un swipe" />
            <BenefitCard icon={TrendingUp} text="Profil mis en avant" />
            <BenefitCard icon={Video} text="Appels vidéo" />
          </div>
        </div>

        {/* Plans d'abonnement (preview) */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 text-center">
            Nos formules Premium
          </h3>
          <div className="space-y-4 mb-8 opacity-60">
            {plans.map((plan) => {
              const Icon = plan.icon;

              return (
                <div
                  key={plan.id}
                  className="relative bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-5 shadow-sm overflow-hidden"
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold rounded-bl-xl rounded-tr-xl">
                      Populaire
                    </div>
                  )}
                  
                  {plan.special && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-semibold rounded-bl-xl rounded-tr-xl">
                      {plan.special}
                    </div>
                  )}

                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">
                          {plan.price} FCFA
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          / {plan.period}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${plan.color} flex-shrink-0`} />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mode Halal */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 mb-6 border-2 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-300 mb-1">Mode Halal inclus dans tous les plans</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                Respectez vos valeurs avec des interactions sécurisées et des photos modérées
              </p>
            </div>
          </div>
        </div>

        {/* CTA pour être notifié */}
        <div className="pb-32">
          <button
            onClick={() => alert('Merci de votre intérêt ! Nous vous notifierons dès que Premium sera disponible. 🎉')}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl active:scale-98 flex items-center justify-center gap-2"
          >
            <Bell className="w-5 h-5" />
            <span>Me notifier du lancement</span>
          </button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
            Soyez parmi les premiers à profiter de nos offres Premium
            <br />
            <span className="text-blue-600 dark:text-blue-400 font-medium">✨ Offres de lancement à venir</span>
          </p>
        </div>
      </div>
    </div>
  );
}

interface BenefitCardProps {
  icon: React.ElementType;
  text: string;
}

function BenefitCard({ icon: Icon, text }: BenefitCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3">
      <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{text}</p>
    </div>
  );
}

// Ajout de l'import manquant
import { Bell } from 'lucide-react';