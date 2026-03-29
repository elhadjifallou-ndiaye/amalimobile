// ============================================================
// supabase/functions/initiate-payment/index.ts
// Crée un paiement PayTech et retourne l'URL de checkout.
//
// Deploy : supabase functions deploy initiate-payment --no-verify-jwt
// Secrets : PAYTECH_API_KEY, PAYTECH_API_SECRET, PAYTECH_ENV
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const PLAN_AMOUNTS: Record<string, number> = {
  amaliessentielv2:     2900,
  amalielitev2:         4900,
  amaliprestigev2:      7900,
  amaliprestigefemmev2: 2000,
  amalivipbadge:        9900,
};

const PLAN_NAMES: Record<string, string> = {
  amaliessentielv2:     'Essentiel',
  amalielitev2:         'Élite',
  amaliprestigev2:      'Prestige',
  amaliprestigefemmev2: 'Prestige Femme',
  amalivipbadge:        'Badge VIP',
};

const PLAN_TIERS: Record<string, string> = {
  amaliessentielv2:     'essentiel',
  amalielitev2:         'elite',
  amaliprestigev2:      'prestige',
  amaliprestigefemmev2: 'prestige-femme',
  amalivipbadge:        'vip-badge',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
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
    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Non authentifié' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Token invalide' }, 401);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400); }

    const planId         = body['planId'] as string;
    const method         = body['method'] as string;
    const phone          = body['phone'] as string | undefined;
    const email          = body['email'] as string;
    const transactionRef = body['transactionRef'] as string;

    const amount   = PLAN_AMOUNTS[planId];
    const planName = PLAN_NAMES[planId];
    const planTier = PLAN_TIERS[planId];

    if (!amount || !planName) return json({ error: 'Plan inconnu' }, 400);
    if (!transactionRef?.startsWith('AMALI-')) return json({ error: 'Référence invalide' }, 400);

    const apiKey    = Deno.env.get('PAYTECH_API_KEY');
    const apiSecret = Deno.env.get('PAYTECH_API_SECRET');
    const env       = Deno.env.get('PAYTECH_ENV') ?? 'prod';

    if (!apiKey || !apiSecret) {
      return json({ error: 'Clés PayTech manquantes' }, 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const ipnUrl      = `${supabaseUrl}/functions/v1/payment-webhook`;

    const customField = JSON.stringify({
      transaction_ref: transactionRef,
      user_id:         user.id,
      plan_id:         planId,
      plan_tier:       planTier,
      method,
      phone: phone ?? null,
    });

    const paytechBody = {
      item_name:    `Amali ${planName}`,
      item_price:   amount,
      currency:     'XOF',
      ref_command:  transactionRef,
      command_name: `Abonnement Amali ${planName}`,
      env,
      ipn_url:      ipnUrl,
      success_url:  `https://amali.love/payment/success?ref=${transactionRef}`,
      cancel_url:   `https://amali.love/payment/cancel?ref=${transactionRef}`,
      custom_field: customField,
    };

    let ptRes: Response;
    try {
      ptRes = await fetch('https://paytech.sn/api/payment/request-payment', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'API_KEY':        apiKey,
          'API_SECRET':     apiSecret,
        },
        body: JSON.stringify(paytechBody),
      });
    } catch (err) {
      console.error('Réseau PayTech:', err);
      return json({ error: 'Impossible de contacter PayTech', details: String(err) }, 502);
    }

    let ptData: Record<string, unknown>;
    try {
      ptData = await ptRes.json();
    } catch {
      const txt = await ptRes.text().catch(() => '');
      console.error(`PayTech réponse non-JSON (${ptRes.status}):`, txt.substring(0, 300));
      return json({ error: `PayTech a répondu ${ptRes.status} non-JSON` }, 502);
    }

    console.log('PayTech réponse:', JSON.stringify(ptData));

    if (!ptData['success'] || ptData['success'] === 0) {
      return json({ error: String(ptData['message'] ?? 'Erreur PayTech'), debug: ptData }, 400);
    }

    const paymentUrl = String(ptData['redirect_url'] ?? '');

    const { error: dbError } = await supabase.from('payments').insert({
      user_id:         user.id,
      transaction_ref: transactionRef,
      plan_id:         planId,
      plan_tier:       planTier,
      amount,
      method,
      phone:           phone ?? null,
      email,
      status:          'pending',
      payment_url:     paymentUrl,
    });

    if (dbError) {
      console.error('DB insert error:', dbError.message);
      return json({ error: 'Erreur base de données', details: dbError.message }, 500);
    }

    return json({ payment_url: paymentUrl, transaction_ref: transactionRef });

  } catch (err) {
    console.error('Erreur non gérée initiate-payment:', err);
    return json({ error: 'Erreur interne', details: String(err) }, 500);
  }
});
