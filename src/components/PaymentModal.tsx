import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Smartphone, CreditCard, Check, Shield, Loader2, AlertCircle, X } from 'lucide-react';
import {
  PlanDefinition,
  PaymentMethod,
  initiatePayment,
  getPaymentStatus,
} from '@/lib/paymentService';
import { authService } from '@/lib/supabase';

interface PaymentModalProps {
  plan: PlanDefinition;
  onClose: () => void;
  onSuccess: (planTier: string) => void;
}

type Step = 'method' | 'form' | 'processing' | 'polling' | 'success' | 'error';

const METHODS: { id: PaymentMethod; label: string; subtitle: string; requiresPhone: boolean; colors: string; dotColor: string }[] = [
  {
    id: 'orange-money',
    label: 'Orange Money',
    subtitle: 'Paiement mobile Orange',
    requiresPhone: true,
    colors: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20',
    dotColor: 'bg-orange-500',
  },
  {
    id: 'wave',
    label: 'Wave',
    subtitle: 'Paiement mobile Wave',
    requiresPhone: true,
    colors: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'card',
    label: 'Carte bancaire',
    subtitle: 'Visa, Mastercard',
    requiresPhone: false,
    colors: 'border-violet-400 bg-violet-50 dark:bg-violet-900/20',
    dotColor: 'bg-violet-500',
  },
];

export default function PaymentModal({ plan, onClose, onSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<Step>('method');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    };
  }, []);

  const currentMethod = METHODS.find((m) => m.id === selectedMethod);
  const requiresPhone = currentMethod?.requiresPhone ?? true;

  function startPolling(transactionRef: string) {
    pollingRef.current = setInterval(async () => {
      const status = await getPaymentStatus(transactionRef);
      if (status?.status === 'completed') {
        clearInterval(pollingRef.current!);
        clearTimeout(pollingTimeoutRef.current!);
        setStep('success');
        onSuccess(status.planTier ?? '');
      } else if (status?.status === 'failed' || status?.status === 'cancelled') {
        clearInterval(pollingRef.current!);
        clearTimeout(pollingTimeoutRef.current!);
        setErrorMsg('Paiement échoué ou annulé. Veuillez réessayer.');
        setStep('error');
      }
    }, 3000);

    // Arrêt après 5 minutes
    pollingTimeoutRef.current = setTimeout(() => {
      clearInterval(pollingRef.current!);
      setErrorMsg('Délai dépassé. Si vous avez payé, contactez le support.');
      setStep('error');
    }, 300_000);
  }

  async function handleSubmit() {
    if (!selectedMethod) return;
    if (requiresPhone && !phone.trim()) return;
    if (!email.trim()) return;

    setStep('processing');
    setErrorMsg('');

    try {
      const { user } = await authService.getCurrentUser();
      if (!user) {
        setErrorMsg('Session expirée. Veuillez vous reconnecter.');
        setStep('error');
        return;
      }

      const result = await initiatePayment({
        planId: plan.id,
        method: selectedMethod,
        phone: requiresPhone ? phone.trim() : undefined,
        email: email.trim(),
        userId: user.id,
      });

      if (!result.success) {
        setErrorMsg(result.error ?? 'Erreur lors de l\'initiation du paiement.');
        setStep('error');
        return;
      }

      setStep('polling');
      startPolling(result.transactionRef);
    } catch {
      setErrorMsg('Une erreur est survenue. Veuillez réessayer.');
      setStep('error');
    }
  }

  function handleRetry() {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    setErrorMsg('');
    setStep('method');
    setSelectedMethod(null);
    setPhone('');
  }

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-700">
        {step === 'form' ? (
          <button onClick={() => setStep('method')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        ) : step === 'method' ? (
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Paiement sécurisé</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{plan.name} — {plan.priceDisplay} FCFA{plan.period === 'month' ? ' / mois' : ' (unique)'}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6">

        {/* ── ÉTAPE 1 : Choix du moyen de paiement ── */}
        {step === 'method' && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-6">
              Choisissez votre moyen de paiement
            </h2>

            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => { setSelectedMethod(m.id); setStep('form'); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:scale-[1.01] active:scale-[0.99] ${m.colors}`}
              >
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${m.dotColor}`} />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">{m.label}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{m.subtitle}</p>
                </div>
                {m.id === 'card' ? (
                  <CreditCard className="w-5 h-5 text-slate-400" />
                ) : (
                  <Smartphone className="w-5 h-5 text-slate-400" />
                )}
              </button>
            ))}

            <div className="mt-8 flex items-center gap-2 justify-center text-xs text-slate-400 dark:text-slate-500">
              <Shield className="w-4 h-4" />
              <span>Paiement 100% sécurisé</span>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 : Formulaire ── */}
        {step === 'form' && selectedMethod && (
          <div className="space-y-5">
            <div className={`p-4 rounded-2xl border-2 ${currentMethod?.colors}`}>
              <p className="font-semibold text-slate-900 dark:text-white">{currentMethod?.label}</p>
            </div>

            {requiresPhone && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ex: 77 123 45 67"
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-400 transition-colors"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Numéro associé à votre compte {currentMethod?.label}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-400 transition-colors"
              />
              <p className="text-xs text-slate-400 mt-1">Pour le reçu de paiement</p>
            </div>

            {/* Récapitulatif */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Récapitulatif</h3>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Plan</span>
                <span className="font-medium text-slate-900 dark:text-white">{plan.name}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-slate-600 dark:text-slate-400">Durée</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {plan.period === 'month' ? '30 jours' : 'À vie'}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 mt-3 pt-3 flex justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Total</span>
                <span className="font-bold text-lg text-rose-600">{plan.priceDisplay} FCFA</span>
              </div>
            </div>

            <div className="pb-8">
              <button
                onClick={handleSubmit}
                disabled={requiresPhone ? !phone.trim() || !email.trim() : !email.trim()}
                className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-600 text-white rounded-2xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:from-rose-600 hover:to-amber-700 shadow-lg"
              >
                Payer {plan.priceDisplay} FCFA
              </button>
              <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" />
                Paiement sécurisé — Annulable à tout moment
              </p>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 : Traitement ── */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
            <p className="font-medium text-slate-700 dark:text-slate-300">Initialisation du paiement...</p>
          </div>
        )}

        {/* ── ÉTAPE 4 : Attente de confirmation ── */}
        {step === 'polling' && (
          <div className="flex flex-col items-center justify-center h-64 gap-6 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-rose-200 dark:border-rose-900 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                En attente de confirmation
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedMethod === 'orange-money' || selectedMethod === 'wave'
                  ? 'Vérifiez votre téléphone et confirmez le paiement'
                  : 'Validez le paiement sur la page sécurisée'}
              </p>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 5 : Succès ── */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center h-64 gap-6 text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white mb-2">Paiement confirmé !</p>
              <p className="text-slate-500 dark:text-slate-400">
                Votre abonnement <strong>{plan.name}</strong> est maintenant actif.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700 transition-colors"
            >
              Continuer
            </button>
          </div>
        )}

        {/* ── ÉTAPE 6 : Erreur ── */}
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center h-64 gap-6 text-center">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">Paiement échoué</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">{errorMsg}</p>
            </div>
            <button
              onClick={handleRetry}
              className="px-8 py-3 bg-rose-600 text-white rounded-2xl font-semibold hover:bg-rose-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
