// ============================================================
// supabase/functions/payment-webhook/index.ts
// IPN PayTech — appelé automatiquement après chaque paiement.
//
// URL IPN à configurer dans le dashboard PayTech :
//   https://coytzhvhksalobmdnzwr.supabase.co/functions/v1/payment-webhook
//
// Deploy : supabase functions deploy payment-webhook --no-verify-jwt
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  try {
    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return json({ error: 'JSON invalide' }, 400);
    }

    console.log('IPN reçu:', JSON.stringify(payload));

    // PayTech envoie type_event = "sale_complete" quand le paiement est validé
    const typeEvent = payload['type_event'] as string | undefined;
    if (typeEvent !== 'sale_complete') {
      console.log(`IPN ignoré: type_event=${typeEvent}`);
      return json({ status: 'ignored', type_event: typeEvent });
    }

    // ref_command = notre transactionRef (AMALI-xxx)
    const transactionRef = payload['ref_command'] as string | undefined;
    if (!transactionRef?.startsWith('AMALI-')) {
      return json({ error: 'ref_command invalide' }, 400);
    }

    // Montant payé (en XOF)
    const chargedAmount = Number(payload['item_price'] ?? 0);

    return await activatePremium(transactionRef, chargedAmount, payload);

  } catch (err) {
    console.error('Erreur non gérée payment-webhook:', err);
    return json({ error: 'Erreur interne', details: String(err) }, 500);
  }
});

async function activatePremium(
  transactionRef: string,
  chargedAmount:  number,
  rawPayload:     Record<string, unknown>
): Promise<Response> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: payment, error: fetchError } = await supabase
    .from('payments').select('*').eq('transaction_ref', transactionRef).single();

  if (fetchError || !payment) {
    console.error('Paiement introuvable:', transactionRef);
    return json({ error: 'Paiement introuvable' }, 404);
  }

  // Idempotence
  if (payment.status === 'completed') return json({ status: 'already_processed' });

  // Vérification montant
  const expectedAmount = PLAN_AMOUNTS[payment.plan_id];
  if (!expectedAmount) return json({ error: 'plan_id inconnu' }, 400);

  if (chargedAmount > 0 && chargedAmount < expectedAmount) {
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

  await supabase.from('payments').update({
    status:          'completed',
    webhook_payload: rawPayload,
    activated_at:    activatedAt.toISOString(),
    expires_at:      expiresAt.toISOString(),
    updated_at:      activatedAt.toISOString(),
  }).eq('transaction_ref', transactionRef);

  await supabase.from('profiles').update({
    is_premium:         true,
    premium_tier:       planTier,
    premium_expires_at: expiresAt.toISOString(),
    updated_at:         activatedAt.toISOString(),
  }).eq('id', payment.user_id);

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
