// Supabase Edge Function – send-push
// Déployer avec : supabase functions deploy send-push
// Secrets requis : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@amali.love';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  image?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const payload: PushPayload = await req.json();
    const { user_id, title, body, image, tag, data } = payload;

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }

    // Récupérer toutes les subscriptions de l'utilisateur
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (error || !subs?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const notification = JSON.stringify({ title, body, image, tag, data });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notification
        )
      )
    );

    // Supprimer les subscriptions expirées (410)
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        const err = result.reason as { statusCode?: number };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subs[i].endpoint);
        }
      }
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return new Response(JSON.stringify({ sent }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
