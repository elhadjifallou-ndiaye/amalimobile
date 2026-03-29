// ============================================================
// src/lib/paymentService.ts
// Service de paiement — implémentation mock (brancher CinetPay/PayDunya ici)
// ============================================================

import { supabase } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────

export type PaymentMethod = 'orange-money' | 'wave' | 'card';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface PlanDefinition {
  id: string;
  tier: string;
  name: string;
  priceAmount: number;  // entier en FCFA
  priceDisplay: string; // ex: '2 900'
  period: 'month' | 'once';
  durationDays: number;
}

export interface InitiatePaymentInput {
  planId: string;
  method: PaymentMethod;
  phone?: string;
  email: string;
  userId: string;
}

export interface InitiatePaymentResult {
  success: boolean;
  transactionRef: string;
  paymentUrl?: string;
  error?: string;
}

export interface PaymentStatusResult {
  transactionRef: string;
  status: PaymentStatus;
  planTier?: string;
  activatedAt?: string;
  expiresAt?: string;
}

// ─── Catalogue des plans (source unique de vérité) ────────────

export const PLANS: PlanDefinition[] = [
  {
    id: 'amaliessentielv2',
    tier: 'essentiel',
    name: 'Essentiel',
    priceAmount: 2900,
    priceDisplay: '2 900',
    period: 'month',
    durationDays: 30,
  },
  {
    id: 'amalielitev2',
    tier: 'elite',
    name: 'Élite',
    priceAmount: 4900,
    priceDisplay: '4 900',
    period: 'month',
    durationDays: 30,
  },
  {
    id: 'amaliprestigev2',
    tier: 'prestige',
    name: 'Prestige',
    priceAmount: 7900,
    priceDisplay: '7 900',
    period: 'month',
    durationDays: 30,
  },
  {
    id: 'amaliprestigefemmev2',
    tier: 'prestige-femme',
    name: 'Prestige Femme',
    priceAmount: 2000,
    priceDisplay: '2 000',
    period: 'month',
    durationDays: 30,
  },
  {
    id: 'amalivipbadge',
    tier: 'vip-badge',
    name: 'Badge VIP',
    priceAmount: 9900,
    priceDisplay: '9 900',
    period: 'once',
    durationDays: 36500,
  },
];

export const getPlanById = (id: string): PlanDefinition | undefined =>
  PLANS.find((p) => p.id === id);

// ─── Helpers internes ─────────────────────────────────────────

function generateTransactionRef(): string {
  return `AMALI-${crypto.randomUUID()}`;
}

// ─── Mock ─────────────────────────────────────────────────────
// Simule un paiement réussi après 5 secondes de polling.
// Insère la ligne payment + appelle le webhook local pour activer le premium.

async function initiatePaymentMock(
  input: InitiatePaymentInput
): Promise<InitiatePaymentResult> {
  const plan = getPlanById(input.planId);
  if (!plan) return { success: false, transactionRef: '', error: 'Plan introuvable' };

  const transactionRef = generateTransactionRef();

  const { error } = await supabase.from('payments').insert({
    user_id: input.userId,
    transaction_ref: transactionRef,
    plan_id: plan.id,
    plan_tier: plan.tier,
    amount: plan.priceAmount,
    method: input.method,
    phone: input.phone ?? null,
    email: input.email,
    status: 'pending',
  });

  if (error) return { success: false, transactionRef: '', error: error.message };

  // En mode mock, on simule la confirmation via l'Edge Function après 5s
  setTimeout(async () => {
    await simulateMockWebhook(transactionRef);
  }, 5000);

  return { success: true, transactionRef };
}

async function simulateMockWebhook(transactionRef: string): Promise<void> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    await fetch(`${supabaseUrl}/functions/v1/payment-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': 'mock-bypass',
      },
      body: JSON.stringify({
        transaction_ref: transactionRef,
        payment_status: 'mock-success',
      }),
    });
  } catch {
    // Erreur silencieuse — le polling détectera si la table est mise à jour
  }
}

// ─── Implémentation PayDunya (via Edge Function) ─────────────

async function initiatePaymentPaydunya(
  input: InitiatePaymentInput
): Promise<InitiatePaymentResult> {
  const plan = getPlanById(input.planId);
  if (!plan) return { success: false, transactionRef: '', error: 'Plan introuvable' };

  const transactionRef = generateTransactionRef();

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { success: false, transactionRef: '', error: 'Non authentifié' };
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-payment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        planId:          plan.id,
        method:          input.method,
        phone:           input.phone,
        email:           input.email,
        transactionRef,
      }),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    return { success: false, transactionRef: '', error: result.error ?? 'Erreur PayDunya' };
  }
  return { success: true, transactionRef, paymentUrl: result.payment_url };
}

// ─── API publique ─────────────────────────────────────────────
//
// USE_MOCK = true  → tests locaux (pas besoin de clés PayDunya)
// USE_MOCK = false → PayDunya réel (clés dans supabase/functions/.env)

const USE_MOCK = false;

export async function initiatePayment(
  input: InitiatePaymentInput
): Promise<InitiatePaymentResult> {
  if (USE_MOCK) return initiatePaymentMock(input);
  return initiatePaymentPaydunya(input);
}

export async function getPaymentStatus(
  transactionRef: string
): Promise<PaymentStatusResult | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('transaction_ref, status, plan_tier, activated_at, expires_at')
    .eq('transaction_ref', transactionRef)
    .single();

  if (error || !data) return null;

  return {
    transactionRef: data.transaction_ref,
    status: data.status as PaymentStatus,
    planTier: data.plan_tier,
    activatedAt: data.activated_at,
    expiresAt: data.expires_at,
  };
}
