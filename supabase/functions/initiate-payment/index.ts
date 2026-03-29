// ============================================================
// supabase/functions/initiate-payment/index.ts
// Crée une facture PayDunya et retourne l'URL de paiement.
//
// Deploy : supabase functions deploy initiate-payment --no-verify-jwt
// Secrets : PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY,
//           PAYDUNYA_TOKEN, PAYDUNYA_PUBLIC_KEY, PAYDUNYA_MODE
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

// ─── Catalogue des plans (source de vérité côté serveur) ─────

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

// ─── CORS ────────────────────────────────────────────────────

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

// ─── Helper PayDunya ─────────────────────────────────────────

function get_mode(): string {
  return Deno.env.get('PAYDUNYA_MODE') ?? 'test';
}

function paydunya_headers() {
  const mode = get_mode();
  const masterKey  = mode === 'live' ? Deno.env.get('PAYDUNYA_MASTER_KEY_LIVE')  : Deno.env.get('PAYDUNYA_MASTER_KEY');
  const privateKey = mode === 'live' ? Deno.env.get('PAYDUNYA_PRIVATE_KEY_LIVE') : Deno.env.get('PAYDUNYA_PRIVATE_KEY');
  const token      = mode === 'live' ? Deno.env.get('PAYDUNYA_TOKEN_LIVE')        : Deno.env.get('PAYDUNYA_TOKEN');

  if (!masterKey || !privateKey || !token) {
    throw new Error(`Missing PayDunya secrets for mode=${mode}`);
  }

  return {
    'Content-Type':         'application/json',
    'PAYDUNYA-MASTER-KEY':  masterKey,
    'PAYDUNYA-PRIVATE-KEY': privateKey,
    'PAYDUNYA-TOKEN':       token,
  };
}

function paydunya_base(): string {
  return get_mode() === 'live'
    ? 'https://app.paydunya.com/api/v1'
    : 'https://app.paydunya.com/sandbox-api/v1';
}

// ─── Handler ─────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  try {
    // Vérifier que l'utilisateur est authentifié
    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Non authentifié' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Vérifier le JWT utilisateur
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ error: 'Token invalide' }, 401);
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'JSON invalide' }, 400);
    }

    const planId         = body['planId'] as string;
    const method         = body['method'] as string;
    const phone          = body['phone'] as string | undefined;
    const email          = body['email'] as string;
    const transactionRef = body['transactionRef'] as string;

    // Valider le plan côté serveur
    const amount   = PLAN_AMOUNTS[planId];
    const planName = PLAN_NAMES[planId];
    const planTier = PLAN_TIERS[planId];

    if (!amount || !planName) {
      return json({ error: 'Plan inconnu' }, 400);
    }

    if (!transactionRef || !transactionRef.startsWith('AMALI-')) {
      return json({ error: 'Référence de transaction invalide' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const ipnUrl = `${supabaseUrl}/functions/v1/payment-webhook`;

    // Construire le body PayDunya
    const paydunya_body = {
      invoice: {
        total_amount: amount,
        description: `Abonnement Amali ${planName} — 30 jours`,
      },
      store: {
        name: 'Amali',
        tagline: "Rencontres halal en Afrique de l'Ouest",
        postal_address: 'Dakar, Sénégal',
        phone: '+221000000000',
        logo_url: 'https://amali.love/logo.png',
        website_url: 'https://amali.love',
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

    // Créer la facture chez PayDunya
    let paydunya_res: Response;
    try {
      paydunya_res = await fetch(`${paydunya_base()}/softorder`, {
        method: 'POST',
        headers: paydunya_headers(),
        body: JSON.stringify(paydunya_body),
      });
    } catch (err) {
      console.error('Erreur réseau PayDunya:', err);
      return json({ error: 'Impossible de contacter PayDunya' }, 502);
    }

    const paydunya_data = await paydunya_res.json();

    if (paydunya_data.response_code !== '00') {
      console.error('PayDunya error:', JSON.stringify(paydunya_data));
      return json({
        error: paydunya_data.response_text ?? 'Erreur PayDunya',
        debug: paydunya_data,
      }, 400);
    }

    const paymentUrl: string = paydunya_data.description?.payment_url ?? paydunya_data.hosted_invoice ?? '';

    // Insérer la ligne pending dans payments
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
      console.error('DB insert error:', dbError);
      return json({ error: 'Erreur base de données', details: dbError.message }, 500);
    }

    return json({ payment_url: paymentUrl, transaction_ref: transactionRef });

  } catch (err) {
    // Top-level catch: garantit que la réponse a toujours les headers CORS
    console.error('Unhandled error in initiate-payment:', err);
    return json({ error: 'Erreur interne', details: String(err) }, 500);
  }
});
