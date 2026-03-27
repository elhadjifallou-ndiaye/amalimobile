-- ============================================================
-- NOTIFICATIONS TABLE - Setup complet & RLS
-- À appliquer dans Supabase SQL Editor
-- ============================================================

-- 1. Créer la table si elle n'existe pas
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  data jsonb default '{}',
  is_read boolean default false,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- 2. Supprimer TOUTES les contraintes check sur la colonne type
-- (peu importe leur nom dans ta DB)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT cc.constraint_name
    FROM information_schema.constraint_column_usage cc
    JOIN information_schema.table_constraints tc
      ON cc.constraint_name = tc.constraint_name
    WHERE cc.table_name = 'notifications'
      AND cc.column_name = 'type'
      AND cc.table_schema = 'public'
      AND tc.constraint_type = 'CHECK'
  LOOP
    EXECUTE 'ALTER TABLE notifications DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

-- 3. Ajouter la contrainte correcte avec TOUS les types utilisés
alter table notifications add constraint notifications_type_check
  check (type in ('new_like', 'new_match', 'new_message', 'profile_view', 'system'));

-- 4. Activer RLS
alter table notifications enable row level security;

-- 5. Supprimer les anciennes policies
drop policy if exists "Users can view own notifications" on notifications;
drop policy if exists "Users can update own notifications" on notifications;
drop policy if exists "Users can delete own notifications" on notifications;
drop policy if exists "Authenticated users can create notifications" on notifications;
drop policy if exists "Authenticated users can insert notifications" on notifications;

-- 6. SELECT
create policy "Users can view own notifications"
  on notifications for select
  to authenticated
  using (auth.uid() = user_id);

-- 7. INSERT : tout user authentifié peut créer une notif pour n'importe qui
-- CRITIQUE pour likes/matchs cross-users
create policy "Authenticated users can create notifications"
  on notifications for insert
  to authenticated
  with check (true);

-- 8. UPDATE
create policy "Users can update own notifications"
  on notifications for update
  to authenticated
  using (auth.uid() = user_id);

-- 9. DELETE
create policy "Users can delete own notifications"
  on notifications for delete
  to authenticated
  using (auth.uid() = user_id);

-- 10. Index
create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_user_id_created_at_idx on notifications(user_id, created_at desc);
create index if not exists notifications_is_read_idx on notifications(user_id, is_read) where is_read = false;

-- 11. Activer Realtime
alter publication supabase_realtime add table notifications;
