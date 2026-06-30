-- 1. Create or ensure prayers table exists with unique constraint
CREATE TABLE IF NOT EXISTS public.prayers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  fajr boolean default false,
  fajr_location text,
  dhuhr boolean default false,
  dhuhr_location text,
  asr boolean default false,
  asr_location text,
  maghrib boolean default false,
  maghrib_location text,
  isha boolean default false,
  isha_location text,
  tahajjud boolean default false,
  tahajjud_location text,
  duha boolean default false,
  duha_location text,
  witr boolean default false,
  witr_location text,
  UNIQUE(user_id, date)
);

-- 2. Create or ensure prayer_times_cache table exists
CREATE TABLE IF NOT EXISTS public.prayer_times_cache (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  fajr text,
  dhuhr text,
  asr text,
  maghrib text,
  isha text,
  sehri text,
  iftar text,
  UNIQUE(user_id, date)
);

-- 3. Grant basic CRUD permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_times_cache TO authenticated;

-- Grant to service_role just in case
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_times_cache TO service_role;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_times_cache ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to prevent duplication
DROP POLICY IF EXISTS "Users can manage their own prayers" ON public.prayers;
DROP POLICY IF EXISTS "Users can manage their own prayer cache" ON public.prayer_times_cache;

-- 6. Create RLS Policies
CREATE POLICY "Users can manage their own prayers" 
ON public.prayers FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own prayer cache" 
ON public.prayer_times_cache FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
