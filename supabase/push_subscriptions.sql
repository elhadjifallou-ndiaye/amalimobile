-- Table pour stocker les subscriptions push des utilisateurs
-- À exécuter dans le SQL Editor de Supabase Dashboard

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, endpoint)
);

-- Index pour les lookups rapides par user_id
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

-- RLS
alter table public.push_subscriptions enable row level security;

create policy "Users can manage their own subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Permettre à la service role (Edge Functions) de lire toutes les subscriptions
create policy "Service role can read all"
  on public.push_subscriptions
  for select
  using (true);


-- ─── TRIGGER : envoyer push quand un like est reçu ────────────────────────────
-- (Appelle l'Edge Function via pg_net - doit être activé dans Supabase)

create or replace function notify_push_on_notification()
returns trigger language plpgsql security definer as $$
declare
  payload jsonb;
  notif_title text;
  notif_body text;
  notif_tag text;
begin
  -- Construire le payload selon le type
  if NEW.type = 'new_like' then
    notif_title := '💛 Quelqu''un t''a liké !';
    notif_body  := 'Quelqu''un a aimé ton profil. Vas voir !';
    notif_tag   := 'like';
  elsif NEW.type = 'new_match' then
    notif_title := '🎉 Nouveau match !';
    notif_body  := 'Vous vous êtes matchés ! Dis bonjour 👋';
    notif_tag   := 'match';
  elsif NEW.type = 'new_message' then
    notif_title := '💬 Nouveau message';
    notif_body  := coalesce(NEW.message, 'Tu as un nouveau message');
    notif_tag   := 'message';
  else
    return NEW;
  end if;

  payload := jsonb_build_object(
    'user_id', NEW.user_id,
    'title',   notif_title,
    'body',    notif_body,
    'tag',     notif_tag,
    'data',    jsonb_build_object('type', NEW.type, 'notification_id', NEW.id)
  );

  -- Appel HTTP vers l'Edge Function (nécessite l'extension pg_net)
  perform net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := payload
  );

  return NEW;
end;
$$;

create trigger push_on_new_notification
  after insert on public.notifications
  for each row execute function notify_push_on_notification();


-- ─── Configurer les variables app (à adapter avec tes vraies valeurs) ─────────
-- alter database postgres set app.supabase_url = 'https://igryslbvshkwpyxahgsi.supabase.co';
-- alter database postgres set app.service_role_key = 'TON_SERVICE_ROLE_KEY';
