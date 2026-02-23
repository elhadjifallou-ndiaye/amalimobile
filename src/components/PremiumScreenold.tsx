import React, { useState, useEffect } from 'react';
import { ArrowLeft, Crown, Sparkles, Star, Check, Eye, RotateCcw, TrendingUp, Video, Shield } from 'lucide-react';
import { InAppPurchase2, IAPProduct } from '@awesome-cordova-plugins/in-app-purchase-2';
import { supabase, authService } from '@/lib/supabase';
import { initIAP } from '../iap';
import { Capacitor } from '@capacitor/core';

interface PremiumScreenProps {
  onClose: () => void;
}

export default function PremiumScreen({ onClose }: PremiumScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>('amalielitev2');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<{ [key: string]: IAPProduct }>({});
  const [iapAvailable, setIapAvailable] = useState(false);

  useEffect(() => {
    const isNativePlatform = Capacitor.isNativePlatform();
    
    if (isNativePlatform) {
      try {
        initIAP();
        setIapAvailable(true);

        const checkProducts = () => {
          try {
            const essentiel = InAppPurchase2.get('amaliessentielv2');
            const elite = InAppPurchase2.get('amalielitev2');
            const prestige = InAppPurchase2.get('amaliprestigev2');
            const prestigeFemme = InAppPurchase2.get('amaliprestigefemmev2');

            setProducts({
              'amaliessentielv2': essentiel,
              'amalielitev2': elite,
              'amaliprestigev2': prestige,
              'amaliprestigefemmev2': prestigeFemme,
            });
          } catch (error) {
            // Erreur silencieuse - les produits ne sont pas encore disponibles
          }
        };

        setTimeout(checkProducts, 1000);
      } catch (error) {
        setIapAvailable(false);
      }
    } else {
      setIapAvailable(false);
    }
  }, []);

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
        { text: '80 likes par jour', included: true },
        { text: '5 super likes par jour', included: true },
        { text: 'Voir qui vous a aimé', included: false },
        { text: 'Annuler un swipe', included: false },
        { text: 'Visibilité accrue', included: false },
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
        { text: '100 likes par jour', included: true },
        { text: '7 super likes par jour', included: true },
        { text: 'Voir qui vous a aimé', included: true },
        { text: 'Annuler un swipe', included: true },
        { text: 'Visibilité accrue', included: true },
        { text: 'Appels vidéo', included: false },
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
        { text: 'Likes illimités', included: true },
        { text: '20 super likes par jour', included: true },
        { text: 'Appels vidéo', included: true },
        { text: 'Voir qui vous a aimé', included: true },
        { text: 'Annuler un swipe', included: true },
        { text: 'Visibilité maximale', included: true },
        { text: 'Statistiques de popularité', included: true },
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
        { text: 'Likes illimités', included: true },
        { text: '30 super likes par jour', included: true },
        { text: 'Voir qui vous a aimé', included: true },
        { text: 'Annuler un match', included: true },
        { text: 'Priorité modérée', included: true },
        { text: 'Sécurité renforcée', included: true },
      ],
    },
  ];

  const updatePremiumStatus = async (planId: string) => {
    try {
      const { user } = await authService.getCurrentUser();
      if (!user) return;

      const planType = planId.includes('essentiel') ? 'essentiel' 
        : planId.includes('femme') ? 'prestige-femme'
        : planId.includes('elite') ? 'elite'
        : 'prestige';

      const { error } = await supabase
        .from('profiles')
        .update({
          is_premium: true,
          premium_tier: planType,
          premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const handleSubscribe = (planId: string | null) => {
    if (!planId || loading) return;

    if (!iapAvailable) {
      alert('⚠️ Paiements non configurés\n\nLes paiements in-app ne sont pas encore configurés sur Google Play Console et App Store Connect.\n\nCette fonctionnalité sera disponible après la configuration.');
      return;
    }

    const product = products[planId];
    if (!product) {
      alert('Produit non disponible. Veuillez réessayer.');
      return;
    }

    if (!product.canPurchase) {
      alert('Ce produit ne peut pas être acheté pour le moment.');
      return;
    }

    setLoading(true);

    try {
      InAppPurchase2.when(planId).approved(async (p: IAPProduct) => {
        try {
          await updatePremiumStatus(p.id);
          p.finish();
          setLoading(false);
          alert('🎉 Abonnement activé avec succès !');
          onClose();
        } catch (error) {
          setLoading(false);
          alert('Erreur lors de l\'activation de l\'abonnement. Contactez le support.');
        }
      });

      InAppPurchase2.when(planId).error((err: any) => {
        setLoading(false);
        
        let errorMessage = 'Erreur lors de l\'achat';
        if (err.code === 'E_USER_CANCELLED') {
          errorMessage = 'Achat annulé';
        } else if (err.code === 'E_NETWORK_ERROR') {
          errorMessage = 'Erreur réseau. Vérifiez votre connexion.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        alert(errorMessage);
      });

      InAppPurchase2.when(planId).cancelled(() => {
        setLoading(false);
      });

      InAppPurchase2.order(planId);
    } catch (error: any) {
      setLoading(false);
      alert('Erreur lors du traitement du paiement');
    }
  };

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
            Choisissez le plan qui vous convient et trouvez votre match idéal plus rapidement
          </p>
        </div>

        {/* Message si IAP non disponible */}
        {!iapAvailable && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg">⚠️</span>
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-300 mb-1">
                  Paiements en configuration
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Les paiements in-app seront disponibles après configuration sur Google Play Console et App Store Connect.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Avantages Premium */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <BenefitCard icon={Eye} text="Voir qui vous aime" />
          <BenefitCard icon={RotateCcw} text="Annuler un swipe" />
          <BenefitCard icon={TrendingUp} text="Profil mis en avant" />
          <BenefitCard icon={Video} text="Appels vidéo" />
        </div>

        {/* Plans d'abonnement */}
        <div className="space-y-4 mb-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            const product = products[plan.id];

            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                disabled={loading}
                className={`w-full text-left transition-all ${isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'} ${loading ? 'opacity-50' : ''}`}
              >
                <div
                  className={`relative bg-white dark:bg-slate-800 rounded-2xl border-2 ${
                    isSelected ? plan.borderColor : 'border-slate-200 dark:border-slate-700'
                  } p-5 shadow-sm hover:shadow-md transition-all overflow-hidden`}
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
                          {product?.price || `${plan.price} FCFA`}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          / {plan.period}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 bg-rose-600 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 rounded-full flex-shrink-0" />
                        )}
                        <span className={`text-sm ${feature.included ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                          {feature.text}
                        </span>
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
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-300 mb-1">Mode Halal inclus dans tous les plans</h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                Respectez vos valeurs avec des interactions sécurisées et des photos modérées
              </p>
            </div>
          </div>
        </div>

        {/* Bouton Souscrire */}
        <div className="pb-32">
          <button
            disabled={!selectedPlan || loading}
            onClick={() => handleSubscribe(selectedPlan)}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-600 text-white rounded-xl font-semibold hover:from-rose-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Traitement...</span>
              </>
            ) : selectedPlan ? (
              `Souscrire à ${plans.find((p) => p.id === selectedPlan)?.name}`
            ) : (
              'Choisissez un plan'
            )}
          </button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
            Paiement sécurisé via {Capacitor.getPlatform() === 'ios' ? 'App Store' : 'Google Play'}
            <br />
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Annulation possible à tout moment</span>
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