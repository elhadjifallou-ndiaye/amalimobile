-- ============================================================
-- PAYMENTS TABLE — Infrastructure de paiement Amali
-- Exécuter dans Supabase SQL Editor
-- ============================================================

create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  transaction_ref       text not null unique,          -- ref interne ex: "AMALI-<uuid>"
  aggregator_ref        text,                          -- ID transaction CinetPay/PayDunya
  plan_id               text not null,                 -- 'amaliessentielv2', 'amalielitev2', etc.
  plan_tier             text not null,                 -- 'essentiel','elite','prestige','prestige-femme','vip-badge'
  amount                integer not null,              -- en FCFA, sans décimales
  currency              text not null default 'XOF',
  method                text,                          -- 'orange-money','wave','card'
  phone                 text,
  email                 text,
  status                text not null default 'pending'
                          check (status in ('pending','processing','completed','failed','cancelled')),
  payment_url           text,                          -- URL de redirection vers l'agrégateur
  webhook_payload       jsonb,                         -- payload brut de l'agrégateur (audit)
  activated_at          timestamptz,
  expires_at            timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Index
create index if not exists payments_user_id_idx         on public.payments(user_id);
create index if not exists payments_transaction_ref_idx on public.payments(transaction_ref);
create index if not exists payments_status_idx          on public.payments(status);
create index if not exists payments_user_status_idx     on public.payments(user_id, status);

-- RLS
alter table public.payments enable row level security;

-- Les utilisateurs voient uniquement leurs propres paiements
create policy "Users can view own payments"
  on public.payments for select
  to authenticated
  using (auth.uid() = user_id);

-- Les utilisateurs authentifiés peuvent créer leurs propres lignes pending
-- (utilisé par le mock ; à supprimer quand l'initiation sera côté serveur)
create policy "Users can create own pending payments"
  on public.payments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
  );

-- Seule la service_role (Edge Functions) peut mettre à jour
-- Aucune politique update/delete pour les utilisateurs
