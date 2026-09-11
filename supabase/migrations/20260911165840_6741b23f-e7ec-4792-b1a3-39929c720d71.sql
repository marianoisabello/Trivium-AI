CREATE OR REPLACE FUNCTION public.create_organization(_name text, _industry text DEFAULT NULL, _size text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _org_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id INTO _org_id FROM public.profiles WHERE id = _uid;
  IF _org_id IS NOT NULL THEN
    UPDATE public.organizations
       SET name = _name, industry = _industry, size = _size
     WHERE id = _org_id;
    RETURN _org_id;
  END IF;

  INSERT INTO public.organizations (name, industry, size)
  VALUES (_name, _industry, _size)
  RETURNING id INTO _org_id;

  INSERT INTO public.profiles (id, organization_id)
  VALUES (_uid, _org_id)
  ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

  RETURN _org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text, text) TO authenticated;