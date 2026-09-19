-- Security hardening: lock down life_os_items, harden messages WITH CHECK,
-- and pin search_path on handle_new_user (SECURITY DEFINER).

-- 1) life_os_items was created without RLS (phase4). Enable owner policies.
ALTER TABLE IF EXISTS public.life_os_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY life_os_items_owner ON public.life_os_items
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Messages: require owning both the row and the parent conversation on write.
DROP POLICY IF EXISTS messages_own ON public.messages;
CREATE POLICY messages_own ON public.messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- 3) SECURITY DEFINER signup trigger: fixed search_path.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  RETURN new;
END;
$$;
