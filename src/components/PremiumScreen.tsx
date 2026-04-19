import React, { useState, useEffect } from 'react';
import { ArrowLeft, Crown, Sparkles, Star, Eye, MessageCircle, TrendingUp, Video, Shield, Check, Mic, Zap } from 'lucide-react';
import { PLANS, PlanDefinition, getPlanById } from '@/lib/paymentService';
import PaymentModal from './PaymentModal';
import { trackViewContent } from '@/lib/pixel';

interface PremiumScreenProps {
  onClose: () => void;
  userGender?: string;
}

// Likes gratuits selon période de lancement (PDF)
function getFreeLikesInfo(): { count: number; until: string } {
  const now = new Date();
  const apr6  = new Date('2026-04-06');
  const apr30 = new Date('2026-04-30');
  if (now < apr6)  return { count: 25, until: '6 avril' };
  if (now < apr30) return { count: 20, until: '30 avril' };
  return { count: 15, until: '' };
}

const PLAN_META: Record<string, {
  color: string;
  borderColor: string;
  badgeColor: string;
  icon: React.ElementType;
  popular?: boolean;
  tag?: string;
  tagColor?: string;
}> = {
  amaliessentielv2: {
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-400',
    badgeColor: 'bg-amber-500',
    icon: Star,
  },
  amalielitev2: {
    color: 'from-yellow-400 to-amber-500',
    borderColor: 'border-yellow-400',
    badgeColor: 'bg-yellow-500',
    icon: Crown,
    popular: true,
    tag: 'Populaire',
    tagColor: 'from-emerald-500 to-teal-600',
  },
  amaliprestigev2: {
    color: 'from-slate-500 to-slate-700',
    borderColor: 'border-slate-500',
    badgeColor: 'bg-slate-600',
    icon: Sparkles,
  },
  amaliprestigefemmev2: {
    color: 'from-pink-400 to-rose-500',
    borderColor: 'border-pink-400',
    badgeColor: 'bg-pink-500',
    icon: Shield,
    tag: 'Offre femmes',
    tagColor: 'from-pink-500 to-rose-600',
  },
  amalivipbadge: {
    color: 'from-amber-400 to-yellow-500',
    borderColor: 'border-amber-400',
    badgeColor: 'bg-amber-400',
    icon: Crown,
    tag: 'Paiement unique',
    tagColor: 'from-amber-500 to-orange-600',
  },
};

// Features exactes selon le PDF
const PLAN_FEATURES: Record<string, string[]> = {
  amaliessentielv2: [
    '30 likes par jour',
    '3 Super Likes par jour',
    'Voir les 5 derniers likes reçus',
    'Visibilité améliorée',
  ],
  amalielitev2: [
    '100 likes par jour',
    '10 Super Likes par jour',
    'Top placement — profil montré plus souvent',
    'Super visibilité',
    'Voir les 10 derniers likes reçus',
    'Envoyer des messages sans match',
    'Messages vocaux',
  ],
  amaliprestigev2: [
    'Likes illimités',
    '15 Super Likes par jour',
    'Contacter qui vous voulez sans attendre le match',
    'Priorité dans les messages envoyés',
    'Appels vidéo',
    'Messages vocaux',
    'Voir toutes les personnes qui vous ont aimé',
    'Visibilité maximale',
  ],
  amaliprestigefemmev2: [
    'Sécurité renforcée',
    'Likes illimités',
    '15 Super Likes par jour',
    'Contacter qui vous voulez sans attendre le match',
    'Contrôle sur qui peut vous contacter',
    'Appels vidéo',
    'Messages vocaux',
    'Voir qui vous a aimé',
    'Visibilité maximale',
  ],
  amalivipbadge: [
    'Badge VIP visible sur le profil',
    "Jusqu'à 5x plus de visibilité en permanence",
    'Profil mis en avant en permanence',
    'Accès prioritaire aux nouvelles fonctionnalités',
    'Réductions sur les événements Amali',
  ],
};

export default function PremiumScreen({ onClose, userGender = '' }: PremiumScreenProps) {
  const isFemme = userGender === 'femme';

  // Plans affichés selon le genre :
  // Femme  → Essentiel, Élite, Prestige Femme, Badge VIP
  // Homme  → Essentiel, Élite, Prestige, Badge VIP
  const displayedPlanIds = isFemme
    ? ['amaliessentielv2', 'amalielitev2', 'amaliprestigefemmev2', 'amalivipbadge']
    : ['amaliessentielv2', 'amalielitev2', 'amaliprestigev2', 'amalivipbadge'];

  const defaultSelected = isFemme ? 'amaliprestigefemmev2' : 'amalielitev2';
  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultSelected);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => { trackViewContent({ content_name: 'Premium' }); }, []);

  const selectedPlan = getPlanById(selectedPlanId);
  const displayedPlans = displayedPlanIds
    .map((id) => PLANS.find((p) => p.id === id))
    .filter(Boolean) as PlanDefinition[];

  const freeLikes = getFreeLikesInfo();

  return (
    <>
      <div className="fixed inset-0 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex flex-col">

        {/* Header */}
        <header
          className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-5 py-4"
          style={{ paddingTop: `calc(env(safe-area-inset-top) + 1rem)` }}
        >
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Premium AMALI</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6">

          {/* Hero */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Améliorez votre expérience
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Choisissez le plan qui vous convient
            </p>
          </div>

          {/* Bannière likes gratuits */}
          <div className="bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-900/20 dark:to-amber-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-300">
                {freeLikes.count} likes gratuits par jour
                {freeLikes.until ? ` jusqu'au ${freeLikes.until}` : ''}
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-400">
                Passez Premium pour ne jamais en manquer
              </p>
            </div>
          </div>

          {/* Avantages clés */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <BenefitCard icon={Eye}           text="Voir qui vous aime" />
            <BenefitCard icon={MessageCircle} text="Écrire sans match" />
            <BenefitCard icon={TrendingUp}    text="Profil mis en avant" />
            <BenefitCard icon={Video}         text="Appels vidéo" />
            <BenefitCard icon={Mic}           text="Messages vocaux" />
            <BenefitCard icon={Shield}        text="Sécurité renforcée" />
          </div>

          {/* Plans */}
          <div className="space-y-4 mb-8">
            {displayedPlans.map((plan) => {
              const meta = PLAN_META[plan.id];
              const Icon = meta.icon;
              const isSelected = selectedPlanId === plan.id;
              const features = PLAN_FEATURES[plan.id] ?? [];

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full text-left transition-all ${isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
                >
                  <div className={`relative bg-white dark:bg-slate-800 rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition-all overflow-hidden ${isSelected ? meta.borderColor : 'border-slate-200 dark:border-slate-700'}`}>

                    {meta.tag && (
                      <div className={`absolute top-0 right-0 px-3 py-1 bg-gradient-to-r ${meta.tagColor} text-white text-xs font-semibold rounded-bl-xl rounded-tr-xl`}>
                        {meta.tag}
                      </div>
                    )}

                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${meta.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {plan.priceDisplay} FCFA
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-sm">
                            {plan.period === 'month' ? '/ mois' : '(unique)'}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${meta.color} flex-shrink-0`} />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mode Halal */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 mb-6 border-2 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
                  Mode Halal inclus dans tous les plans
                </h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Interactions sécurisées et photos modérées
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="pb-32">
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={!selectedPlanId}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-600 text-white rounded-2xl font-semibold hover:from-rose-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedPlan
                ? `Souscrire — ${selectedPlan.priceDisplay} FCFA${selectedPlan.period === 'month' ? ' / mois' : ''}`
                : 'Choisissez un plan'}
            </button>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
              Orange Money · Wave · Carte bancaire
              <br />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Annulation possible à tout moment
              </span>
            </p>
          </div>

        </div>
      </div>

      {/* Modal de paiement */}
      {showPaymentModal && selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(_tier) => {
            setShowPaymentModal(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

interface BenefitCardProps {
  icon: React.ElementType;
  text: string;
}

function BenefitCard({ icon: Icon, text }: BenefitCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-3">
      <div className="w-9 h-9 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
      </div>
      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{text}</p>
    </div>
  );
}
