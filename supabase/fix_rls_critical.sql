-- ============================================================
-- FIX CRITIQUE : Activer RLS sur conversations, likes, matches
-- ============================================================

-- ============================================================
-- 1. LIKES
-- ============================================================
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes: select own" ON public.likes;
DROP POLICY IF EXISTS "likes: insert own" ON public.likes;
DROP POLICY IF EXISTS "likes: delete own" ON public.likes;

-- Voir ses propres likes envoyés + les likes reçus (pour détection match)
CREATE POLICY "likes: select own"
ON public.likes FOR SELECT
USING (
  auth.uid() = from_user_id
  OR auth.uid() = to_user_id
);

-- Insérer uniquement ses propres likes
CREATE POLICY "likes: insert own"
ON public.likes FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

-- Supprimer uniquement ses propres likes
CREATE POLICY "likes: delete own"
ON public.likes FOR DELETE
USING (auth.uid() = from_user_id);


-- ============================================================
-- 2. MATCHES
-- ============================================================
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches: select own" ON public.matches;
DROP POLICY IF EXISTS "matches: insert own" ON public.matches;

-- Voir uniquement ses propres matchs
CREATE POLICY "matches: select own"
ON public.matches FOR SELECT
USING (
  auth.uid() = user1_id
  OR auth.uid() = user2_id
);

-- Insérer un match (les deux parties peuvent le créer)
CREATE POLICY "matches: insert own"
ON public.matches FOR INSERT
WITH CHECK (
  auth.uid() = user1_id
  OR auth.uid() = user2_id
);


-- ============================================================
-- 3. CONVERSATIONS
-- ============================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations: select own" ON public.conversations;
DROP POLICY IF EXISTS "conversations: insert own" ON public.conversations;
DROP POLICY IF EXISTS "conversations: update own" ON public.conversations;

-- Voir uniquement ses propres conversations
CREATE POLICY "conversations: select own"
ON public.conversations FOR SELECT
USING (
  auth.uid() = user1_id
  OR auth.uid() = user2_id
);

-- Créer une conversation (uniquement si on en fait partie)
CREATE POLICY "conversations: insert own"
ON public.conversations FOR INSERT
WITH CHECK (
  auth.uid() = user1_id
  OR auth.uid() = user2_id
);

-- Mettre à jour ses conversations (last_message, unread_count...)
CREATE POLICY "conversations: update own"
ON public.conversations FOR UPDATE
USING (
  auth.uid() = user1_id
  OR auth.uid() = user2_id
);
