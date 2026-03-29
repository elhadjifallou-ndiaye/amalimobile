// ============================================================
// supabase/functions/initiate-payment/index.ts
// Crée une facture PayDunya et retourne l'URL de paiement.
//
// Deploy : supabase functions deploy initiate-payment --no-verify-jwt
// Secrets : PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY,
//           PAYDUNYA_TOKEN, PAYDUNYA_MODE
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

function get_mode(): string {
  return Deno.env.get('PAYDUNYA_MODE') ?? 'test';
}

function paydunya_base(): string {
  // IMPORTANT: endpoint correct = /checkout-invoice/create (pas /softorder)
  return get_mode() === 'live'
    ? 'https://app.paydunya.com/api/v1/checkout-invoice/create'
    : 'https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create';
}

function paydunya_verify_base(token: string): string {
  return get_mode() === 'live'
    ? `https://app.paydunya.com/api/v1/checkout-invoice/confirm/${token}`
    : `https://app.paydunya.com/sandbox-api/v1/checkout-invoice/confirm/${token}`;
}

function paydunya_headers() {
  const mode = get_mode();
  const masterKey  = mode === 'live' ? Deno.env.get('PAYDUNYA_MASTER_KEY_LIVE')  : Deno.env.get('PAYDUNYA_MASTER_KEY');
  const privateKey = mode === 'live' ? Deno.env.get('PAYDUNYA_PRIVATE_KEY_LIVE') : Deno.env.get('PAYDUNYA_PRIVATE_KEY');
  const apiToken   = mode === 'live' ? Deno.env.get('PAYDUNYA_TOKEN_LIVE')        : Deno.env.get('PAYDUNYA_TOKEN');

  if (!masterKey || !privateKey || !apiToken) {
    throw new Error(`Secrets PayDunya manquants pour mode=${mode} (master=${!!masterKey} private=${!!privateKey} token=${!!apiToken})`);
  }

  return {
    'Content-Type':         'application/json',
    'PAYDUNYA-MASTER-KEY':  masterKey,
    'PAYDUNYA-PRIVATE-KEY': privateKey,
    'PAYDUNYA-TOKEN':       apiToken,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  try {
    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Non authentifié' }, 401);
    }

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
    if (!transactionRef || !transactionRef.startsWith('AMALI-')) {
      return json({ error: 'Référence transaction invalide' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const ipnUrl = `${supabaseUrl}/functions/v1/payment-webhook`;

    const paydunya_body = {
      invoice: {
        total_amount: amount,
        description:  `Abonnement Amali ${planName}`,
      },
      store: {
        name:           'Amali',
        tagline:        "Rencontres halal en Afrique de l'Ouest",
        postal_address: 'Dakar, Sénégal',
        phone:          '+221000000000',
        logo_url:       'https://amali.love/logo.png',
        website_url:    'https://amali.love',
      },
      actions: {
        cancel_url:   `https://amali.love/payment/cancel?ref=${transactionRef}`,
        return_url:   `https://amali.love/payment/success?ref=${transactionRef}`,
        callback_url: ipnUrl,
      },
      custom_data: {
        transaction_ref: transactionRef,
        user_id:         user.id,
        plan_id:         planId,
        plan_tier:       planTier,
        method:          method,
        phone:           phone ?? null,
      },
    };

    // Appel PayDunya — endpoint correct : /checkout-invoice/create
    let paydunya_res: Response;
    try {
      paydunya_res = await fetch(paydunya_base(), {
        method:  'POST',
        headers: paydunya_headers(),
        body:    JSON.stringify(paydunya_body),
      });
    } catch (err) {
      console.error('Réseau PayDunya:', err);
      return json({ error: 'Impossible de contacter PayDunya', details: String(err) }, 502);
    }

    // Parse JSON — PayDunya peut renvoyer du HTML si endpoint faux (404)
    let paydunya_data: Record<string, unknown>;
    try {
      paydunya_data = await paydunya_res.json();
    } catch {
      const txt = await paydunya_res.text().catch(() => '');
      console.error(`PayDunya réponse non-JSON (status=${paydunya_res.status}):`, txt.substring(0, 300));
      return json({ error: `PayDunya a répondu ${paydunya_res.status} non-JSON (endpoint invalide ?)` }, 502);
    }

    console.log('PayDunya réponse:', JSON.stringify(paydunya_data));

    if (paydunya_data['response_code'] !== '00') {
      return json({ error: String(paydunya_data['response_text'] ?? 'Erreur PayDunya'), debug: paydunya_data }, 400);
    }

    // response_text = URL de la page de paiement hébergée
    const paymentUrl = String(paydunya_data['response_text'] ?? '');

    const { error: dbError } = await supabase.from('payments').insert({
      user_id:         user.id,
      transaction_ref: transactionRef,
      plan_id:         planId,
      plan_tier:       planTier,
      amount:          amount,
      method:          method,
      phone:           phone ?? null,
      email:           email,
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
