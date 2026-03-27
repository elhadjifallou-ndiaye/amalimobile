-- ============================================================
-- CRÉER LE COMPTE ADMIN
-- À exécuter dans Supabase SQL Editor (une seule fois)
-- ============================================================

-- Étape 1 : Mettre à jour le mot de passe si le compte existe déjà
UPDATE auth.users
SET
  encrypted_password = crypt('Amali@Admin2024!', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now()
WHERE email = 'admin@amali.love';

-- Étape 2 : Créer le compte s'il n'existe pas encore
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated', 'authenticated',
  'admin@amali.love',
  crypt('Amali@Admin2024!', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin"}',
  false, '', ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'admin@amali.love'
);

-- Vérification
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'admin@amali.love';
