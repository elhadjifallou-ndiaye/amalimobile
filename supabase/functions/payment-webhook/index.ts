// ============================================================
// supabase/functions/payment-webhook/index.ts
// IPN PayDunya — appelé automatiquement après chaque paiement.
//
// URL à configurer sur PayDunya :
//   https://coytzhvhksalobmdnzwr.supabase.co/functions/v1/payment-webhook
//
// Deploy : supabase functions deploy payment-webhook --no-verify-jwt
// Secrets : PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY,
//           PAYDUNYA_TOKEN, PAYDUNYA_MODE, MOCK_ENABLED
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

// ─── Catalogues serveur ───────────────────────────────────────

const PLAN_AMOUNTS: Record<string, number> = {
  amaliessentielv2:     2900,
  amalielitev2:         4900,
  amaliprestigev2:      7900,
  amaliprestigefemmev2: 2000,
  amalivipbadge:        9900,
};

const PLAN_TIERS: Record<string, string> = {
  amaliessentielv2:     'essentiel',
  amalielitev2:         'elite',
  amaliprestigev2:      'prestige',
  amaliprestigefemmev2: 'prestige-femme',
  amalivipbadge:        'vip-badge',
};

const PLAN_DURATION_DAYS: Record<string, number> = {
  amaliessentielv2:     30,
  amalielitev2:         30,
  amaliprestigev2:      30,
  amaliprestigefemmev2: 30,
  amalivipbadge:        36500,
};

const TIER_LABELS: Record<string, string> = {
  'essentiel':      'Essentiel',
  'elite':          'Élite',
  'prestige':       'Prestige',
  'prestige-femme': 'Prestige Femme',
  'vip-badge':      'Badge VIP',
};

// ─── CORS ────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-webhook-signature, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ─── Vérification PayDunya (appel direct à leur API) ─────────

async function verifyWithPaydunya(invoiceToken: string): Promise<{
  verified: boolean;
  status: string;
  amount: number;
  customData: Record<string, string>;
}> {
  const mode = Deno.env.get('PAYDUNYA_MODE') ?? 'test';
  const base = mode === 'live'
    ? 'https://app.paydunya.com/api/v1'
    : 'https://app.paydunya.com/sandbox-api/v1';

  const masterKey  = mode === 'live' ? Deno.env.get('PAYDUNYA_MASTER_KEY_LIVE')  : Deno.env.get('PAYDUNYA_MASTER_KEY');
  const privateKey = mode === 'live' ? Deno.env.get('PAYDUNYA_PRIVATE_KEY_LIVE') : Deno.env.get('PAYDUNYA_PRIVATE_KEY');
  const token      = mode === 'live' ? Deno.env.get('PAYDUNYA_TOKEN_LIVE')        : Deno.env.get('PAYDUNYA_TOKEN');

  if (!masterKey || !privateKey || !token) {
    console.error(`Missing PayDunya secrets for mode=${mode}`);
    return { verified: false, status: 'error', amount: 0, customData: {} };
  }

  const res = await fetch(`${base}/checkout-invoice/confirm/${invoiceToken}`, {
    headers: {
      'PAYDUNYA-MASTER-KEY':  masterKey,
      'PAYDUNYA-PRIVATE-KEY': privateKey,
      'PAYDUNYA-TOKEN':       token,
    },
  });

  if (!res.ok) {
    console.error('PayDunya check-status failed:', res.status);
    return { verified: false, status: 'error', amount: 0, customData: {} };
  }

  const data = await res.json();
  return {
    verified:   true,
    status:     data.status ?? 'unknown',
    amount:     Number(data.invoice?.total_amount ?? 0),
    customData: data.custom_data ?? {},
  };
}

// ─── Handler principal ────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  try {
    const bodyText = await req.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return json({ error: 'JSON invalide' }, 400);
    }

    // ── Mode mock (tests locaux) ──────────────────────────────────
    const isMockBypass = req.headers.get('x-webhook-signature') === 'mock-bypass';
    if (isMockBypass) {
      if (Deno.env.get('MOCK_ENABLED') === 'false') {
        return json({ error: 'Mock désactivé' }, 403);
      }
      const transactionRef = payload['transaction_ref'] as string;
      const status = payload['payment_status'] as string;
      if (!transactionRef || status !== 'mock-success') {
        return json({ error: 'Payload mock invalide' }, 400);
      }
      return await activatePremium(transactionRef, null, payload);
    }

    // ── IPN PayDunya ──────────────────────────────────────────────
    const data = payload['data'] as Record<string, unknown> | undefined;
    if (!data) return json({ error: 'Payload invalide' }, 400);

    const invoice    = data['invoice']     as Record<string, unknown> | undefined;
    const customData = data['custom_data'] as Record<string, string>  | undefined;

    const invoiceToken   = invoice?.['token']               as string | undefined;
    const transactionRef = customData?.['transaction_ref']  as string | undefined;

    if (!invoiceToken || !transactionRef) {
      return json({ error: 'token ou transaction_ref manquant' }, 400);
    }

    // Vérifier directement chez PayDunya
    const verification = await verifyWithPaydunya(invoiceToken);

    if (!verification.verified) {
      return json({ error: 'Vérification PayDunya échouée' }, 502);
    }

    if (verification.status !== 'completed') {
      console.log(`IPN reçu avec status=${verification.status} pour ref=${transactionRef}`);
      return json({ status: verification.status });
    }

    return await activatePremium(transactionRef, verification.amount, payload);

  } catch (err) {
    // Top-level catch: garantit que la réponse a toujours les headers CORS
    console.error('Unhandled error in payment-webhook:', err);
    return json({ error: 'Erreur interne', details: String(err) }, 500);
  }
});

// ─── Activation premium (partagée mock + IPN réel) ───────────

async function activatePremium(
  transactionRef: string,
  chargedAmount: number | null,
  rawPayload: Record<string, unknown>
): Promise<Response> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Récupérer la ligne de paiement
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('*')
    .eq('transaction_ref', transactionRef)
    .single();

  if (fetchError || !payment) {
    console.error('Paiement introuvable:', transactionRef);
    return json({ error: 'Paiement introuvable' }, 404);
  }

  // Idempotence
  if (payment.status === 'completed') {
    return json({ status: 'already_processed' });
  }

  // Vérification du montant
  const expectedAmount = PLAN_AMOUNTS[payment.plan_id];
  if (!expectedAmount) {
    return json({ error: 'plan_id inconnu' }, 400);
  }
  if (chargedAmount !== null && chargedAmount < expectedAmount) {
    console.error(`Montant insuffisant: attendu=${expectedAmount} reçu=${chargedAmount}`);
    await supabase.from('payments')
      .update({ status: 'failed', webhook_payload: rawPayload, updated_at: new Date().toISOString() })
      .eq('transaction_ref', transactionRef);
    return json({ error: 'Montant insuffisant' }, 400);
  }

  const planTier     = PLAN_TIERS[payment.plan_id];
  const durationDays = PLAN_DURATION_DAYS[payment.plan_id] ?? 30;
  const activatedAt  = new Date();
  const expiresAt    = new Date(activatedAt.getTime() + durationDays * 86400_000);

  // 1. Marquer le paiement complété
  const { error: payErr } = await supabase.from('payments').update({
    status:          'completed',
    webhook_payload: rawPayload,
    activated_at:    activatedAt.toISOString(),
    expires_at:      expiresAt.toISOString(),
    updated_at:      activatedAt.toISOString(),
  }).eq('transaction_ref', transactionRef);

  if (payErr) {
    console.error('Erreur update payment:', payErr);
    return json({ error: 'DB error', details: payErr.message }, 500);
  }

  // 2. Activer le premium sur le profil
  const { error: profileErr } = await supabase.from('profiles').update({
    is_premium:         true,
    premium_tier:       planTier,
    premium_expires_at: expiresAt.toISOString(),
    updated_at:         activatedAt.toISOString(),
  }).eq('id', payment.user_id);

  if (profileErr) {
    console.error('Erreur update profile:', profileErr);
    return json({ error: 'Profile update failed', details: profileErr.message }, 500);
  }

  // 3. Notification
  await supabase.from('notifications').insert({
    user_id: payment.user_id,
    type:    'system',
    title:   'Premium activé !',
    message: `Votre abonnement ${TIER_LABELS[planTier] ?? planTier} est maintenant actif.`,
    data:    { action: 'premium_activated', plan_tier: planTier },
  });

  console.log(`✅ Premium activé — user=${payment.user_id} plan=${planTier} expire=${expiresAt.toISOString()}`);

  return json({ status: 'ok', activated: true });
}
