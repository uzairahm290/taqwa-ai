GRANT SELECT, INSERT, UPDATE, DELETE ON public.duas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.duas TO service_role;

ALTER TABLE public.duas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own duas." ON public.duas;

CREATE POLICY "Users can manage their own duas." 
ON public.duas FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
