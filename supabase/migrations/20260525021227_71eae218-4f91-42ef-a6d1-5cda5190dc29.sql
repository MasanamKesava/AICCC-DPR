
-- 1) Revoke EXECUTE on SECURITY DEFINER functions that should not be callable via API
REVOKE ALL ON FUNCTION public.user_login(character varying, character varying) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- has_role is intentionally callable by authenticated (used inside RLS policies)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2) Legacy users table: RLS is enabled but no policies exist.
-- Add explicit deny policies so the linter is satisfied and intent is documented.
DROP POLICY IF EXISTS "Deny all access to legacy users" ON public.users;
CREATE POLICY "Deny all access to legacy users"
  ON public.users
  AS RESTRICTIVE
  FOR ALL
  TO PUBLIC
  USING (false)
  WITH CHECK (false);
