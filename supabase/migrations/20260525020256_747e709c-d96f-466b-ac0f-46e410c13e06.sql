
-- 1) Lock down legacy `users` table that holds password hashes & emails.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.users FROM anon, authenticated;
-- (no policies = deny all access via PostgREST)

-- 2) Make signatures storage bucket private so direct CDN URLs no longer work.
UPDATE storage.buckets SET public = false WHERE id = 'signatures';

-- 3) Harden user_login function search_path (and keep it usable for legacy login path).
CREATE OR REPLACE FUNCTION public.user_login(p_email character varying, p_password character varying)
RETURNS TABLE(user_id integer, full_name character varying, email character varying, role character varying, department character varying, login_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
BEGIN
    RETURN QUERY
    SELECT u.id, u.full_name, u.email, u.role, u.department, 'LOGIN SUCCESS'
    FROM public.users u
    WHERE u.email = p_email
      AND u.password_hash = public.crypt(p_password, u.password_hash)
      AND u.is_active = TRUE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::INT, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, 'INVALID EMAIL OR PASSWORD'::TEXT;
    END IF;
END;
$function$;
