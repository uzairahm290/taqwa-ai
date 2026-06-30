-- 1. Create or ensure youtube_playlists table exists
CREATE TABLE IF NOT EXISTS public.youtube_playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  playlist_id text not null,
  title text not null,
  total_videos integer default 0,
  added_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(user_id, playlist_id)
);

-- 2. Create or ensure youtube_progress table exists
CREATE TABLE IF NOT EXISTS public.youtube_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  playlist_id text not null,
  video_id text not null,
  watched boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(user_id, playlist_id, video_id)
);

-- 3. Grant basic CRUD permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_playlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_progress TO authenticated;

-- Grant to service_role just in case
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_playlists TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_progress TO service_role;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.youtube_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_progress ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to prevent duplication
DROP POLICY IF EXISTS "Users can manage their own playlists" ON public.youtube_playlists;
DROP POLICY IF EXISTS "Users can manage their own video progress" ON public.youtube_progress;

-- 6. Create RLS Policies
CREATE POLICY "Users can manage their own playlists" 
ON public.youtube_playlists FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own video progress" 
ON public.youtube_progress FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
