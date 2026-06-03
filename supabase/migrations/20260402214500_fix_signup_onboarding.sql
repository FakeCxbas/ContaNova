-- Fix signup onboarding so self-registered users own their company
-- and signup metadata initializes the company correctly.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
  requested_role public.app_role;
  company_name text;
  company_ruc text;
BEGIN
  requested_role := CASE COALESCE(NEW.raw_user_meta_data->>'app_role', '')
    WHEN 'admin' THEN 'admin'::public.app_role
    WHEN 'contador' THEN 'contador'::public.app_role
    WHEN 'empleado' THEN 'empleado'::public.app_role
    ELSE 'admin'::public.app_role
  END;

  company_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'company_name', '')), '');
  company_ruc := COALESCE(NEW.raw_user_meta_data->>'ruc', '');

  INSERT INTO public.companies (name, ruc)
  VALUES (
    COALESCE(
      company_name,
      NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ) || ' - Empresa',
    company_ruc
  )
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, full_name, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    new_company_id
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested_role);

  RETURN NEW;
END;
$$;
