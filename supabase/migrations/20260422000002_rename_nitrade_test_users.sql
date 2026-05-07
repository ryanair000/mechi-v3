DO $$
DECLARE
  kenya_profile_id uuid;
  ufc_profile_id uuid;
BEGIN
  SELECT id
  INTO kenya_profile_id
  FROM public.profiles
  WHERE username = 'nitradekenya';

  IF kenya_profile_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE username = 'testerbeta1'
        AND id <> kenya_profile_id
    ) THEN
      RAISE EXCEPTION 'Cannot rename nitradekenya to testerbeta1 because testerbeta1 is already in use.';
    END IF;

    UPDATE public.profiles
    SET username = 'testerbeta1'
    WHERE id = kenya_profile_id;
  END IF;

  SELECT id
  INTO ufc_profile_id
  FROM public.profiles
  WHERE username = 'nitradeufc';

  IF ufc_profile_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE username = 'testerbeta2'
        AND id <> ufc_profile_id
    ) THEN
      RAISE EXCEPTION 'Cannot rename nitradeufc to testerbeta2 because testerbeta2 is already in use.';
    END IF;

    UPDATE public.profiles
    SET username = 'testerbeta2'
    WHERE id = ufc_profile_id;
  END IF;
END
$$;
