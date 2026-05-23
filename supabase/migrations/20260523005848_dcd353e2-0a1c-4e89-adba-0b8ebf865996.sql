-- 1. Profiles: stop exposing all emails to every authenticated user
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- 2. Storage: replace broad public SELECT on signatures with an
-- authenticated, owner-scoped listing policy. Public bucket still serves
-- files by direct URL; this just stops anonymous listing of all objects.
DROP POLICY IF EXISTS "Signatures public read" ON storage.objects;

CREATE POLICY "Users list own signatures"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'signatures'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);