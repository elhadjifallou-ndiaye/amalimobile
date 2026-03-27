import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || '';

if (!serviceKey) {
  console.error(
    '❌ VITE_SUPABASE_SERVICE_KEY manquant.\n' +
    'Ajoute cette variable dans .env :\n' +
    'VITE_SUPABASE_SERVICE_KEY=<service_role key depuis Supabase → Settings → API>'
  );
}

// Client avec service role key → bypass RLS, uniquement utilisé dans l'admin
export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceKey || supabaseUrl, // évite le crash si clé manquante
  { auth: { persistSession: false } }
);
