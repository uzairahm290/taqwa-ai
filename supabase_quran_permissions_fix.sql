-- Grant basic privileges to the authenticated role
GRANT ALL ON public.quran_surahs TO authenticated;
GRANT ALL ON public.quran_logs TO authenticated;
GRANT ALL ON public.quran_settings TO authenticated;

GRANT ALL ON public.quran_surahs TO service_role;
GRANT ALL ON public.quran_logs TO service_role;
GRANT ALL ON public.quran_settings TO service_role;

-- Enable Row Level Security
ALTER TABLE public.quran_surahs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Users can manage their own quran_surahs" ON public.quran_surahs;
DROP POLICY IF EXISTS "Users can manage their own quran_logs" ON public.quran_logs;
DROP POLICY IF EXISTS "Users can manage their own quran_settings" ON public.quran_settings;

-- Create comprehensive RLS policies
CREATE POLICY "Users can manage their own quran_surahs"
ON public.quran_surahs FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own quran_logs"
ON public.quran_logs FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own quran_settings"
ON public.quran_settings FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
