-- ============================================================
-- FIX: Storage RLS policies pour les 3 buckets
-- ============================================================

-- ============================================================
-- 1. PROFILE-PHOTOS
--    Restreindre UPDATE + DELETE au propriétaire du dossier
-- ============================================================

-- Supprimer les anciennes policies trop larges
DROP POLICY IF EXISTS "Authenticated users can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;

-- SELECT : public (lecture des photos de profil)
CREATE POLICY "profile-photos: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- INSERT : uniquement dans son propre dossier {user_id}/...
CREATE POLICY "profile-photos: owner insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE : uniquement ses propres fichiers
CREATE POLICY "profile-photos: owner update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE : uniquement ses propres fichiers
CREATE POLICY "profile-photos: owner delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================
-- 2. COMMUNITY-IMAGES
--    Ajouter UPDATE + DELETE manquants, restreints au propriétaire
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can upload community images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view community images" ON storage.objects;
DROP POLICY IF EXISTS "community-images: authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "community-images: public read" ON storage.objects;

-- SELECT : public
CREATE POLICY "community-images: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-images');

-- INSERT : authentifié, dans son propre dossier posts/{user_id}/...
CREATE POLICY "community-images: owner insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- UPDATE : propriétaire uniquement
CREATE POLICY "community-images: owner update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'community-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- DELETE : propriétaire uniquement
CREATE POLICY "community-images: owner delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[2] = auth.uid()::text
);


-- ============================================================
-- 3. CHAT-IMAGES
--    Restreindre INSERT à authenticated + ajouter UPDATE/DELETE
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "chat-images: authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "chat-images: public read" ON storage.objects;

-- SELECT : public (pour affichage dans le chat)
CREATE POLICY "chat-images: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

-- INSERT : authentifié uniquement
CREATE POLICY "chat-images: authenticated insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images'
  AND auth.uid() IS NOT NULL
);

-- UPDATE : authentifié uniquement
CREATE POLICY "chat-images: authenticated update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chat-images'
  AND auth.uid() IS NOT NULL
);

-- DELETE : authentifié uniquement
CREATE POLICY "chat-images: authenticated delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-images'
  AND auth.uid() IS NOT NULL
);
