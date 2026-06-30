CREATE TABLE IF NOT EXISTS public.duas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  arabic text not null,
  translation text not null,
  transliteration text,
  source text,
  category text default 'General',
  is_custom boolean default false,
  is_favorite boolean default false,
  is_daily boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.duas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own duas." 
ON public.duas FOR ALL 
USING (auth.uid() = user_id);
