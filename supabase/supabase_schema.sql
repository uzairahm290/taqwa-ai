-- ============================================================
-- Mizan AI — Supabase Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── prayers ───────────────────────────────────────────────
create table if not exists prayers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
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
  tarawih boolean default false,
  unique(user_id, date)
);
alter table prayers enable row level security;
drop policy if exists "Users manage own prayers" on prayers;
create policy "Users manage own prayers" on prayers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── prayer_times_cache ────────────────────────────────────
create table if not exists prayer_times_cache (
  user_id uuid references auth.users on delete cascade,
  date date not null,
  fajr text, dhuhr text, asr text, maghrib text, isha text,
  sehri text, iftar text,
  primary key (user_id, date)
);
alter table prayer_times_cache enable row level security;
drop policy if exists "Users manage own cache" on prayer_times_cache;
create policy "Users manage own cache" on prayer_times_cache for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── user_location ─────────────────────────────────────────
create table if not exists user_location (
  user_id uuid primary key references auth.users on delete cascade,
  lat float, lng float, city text,
  calculation_method text default 'Karachi',
  madhab text default 'Hanafi'
);
alter table user_location enable row level security;
drop policy if exists "Users manage own location" on user_location;
create policy "Users manage own location" on user_location for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── mosque_checkins ───────────────────────────────────────
create table if not exists mosque_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  prayer_name text,
  mosque_name text,
  mosque_place_id text,
  lat float, lng float,
  checked_in_at timestamp with time zone default now(),
  auto_detected boolean default false
);
alter table mosque_checkins enable row level security;
drop policy if exists "Users manage own checkins" on mosque_checkins;
create policy "Users manage own checkins" on mosque_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── habits ────────────────────────────────────────────────
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  icon text,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);
alter table habits enable row level security;
drop policy if exists "Users manage own habits" on habits;
create policy "Users manage own habits" on habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── habit_logs ────────────────────────────────────────────
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  habit_id uuid references habits on delete cascade,
  date date not null,
  completed boolean default false,
  unique(user_id, habit_id, date)
);
alter table habit_logs enable row level security;
drop policy if exists "Users manage own habit logs" on habit_logs;
create policy "Users manage own habit logs" on habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── quran_settings ────────────────────────────────────────
create table if not exists quran_settings (
  user_id uuid primary key references auth.users on delete cascade,
  method text default 'page',
  daily_goal integer default 2,
  target_date date
);
alter table quran_settings enable row level security;
drop policy if exists "Users manage own quran settings" on quran_settings;
create policy "Users manage own quran settings" on quran_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── quran_logs ────────────────────────────────────────────
create table if not exists quran_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  date date not null,
  value integer default 0,
  unique(user_id, date)
);
alter table quran_logs enable row level security;
drop policy if exists "Users manage own quran logs" on quran_logs;
create policy "Users manage own quran logs" on quran_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── quran_surahs ──────────────────────────────────────────
create table if not exists quran_surahs (
  user_id uuid references auth.users on delete cascade,
  surah_number integer not null,
  completed boolean default false,
  primary key (user_id, surah_number)
);
alter table quran_surahs enable row level security;
drop policy if exists "Users manage own surah progress" on quran_surahs;
create policy "Users manage own surah progress" on quran_surahs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── youtube_playlists ─────────────────────────────────────
create table if not exists youtube_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  playlist_id text not null,
  title text,
  total_videos integer default 0,
  added_at timestamp with time zone default now(),
  unique(user_id, playlist_id)
);
alter table youtube_playlists enable row level security;
drop policy if exists "Users manage own playlists" on youtube_playlists;
create policy "Users manage own playlists" on youtube_playlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── youtube_progress ──────────────────────────────────────
create table if not exists youtube_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  playlist_id text not null,
  video_id text not null,
  watched boolean default false,
  unique(user_id, playlist_id, video_id)
);
alter table youtube_progress enable row level security;
drop policy if exists "Users manage own video progress" on youtube_progress;
create policy "Users manage own video progress" on youtube_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── duas ──────────────────────────────────────────────────
create table if not exists duas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  arabic text,
  transliteration text,
  translation text,
  source text,
  category text,
  is_daily boolean default false,
  is_custom boolean default false,
  is_favorite boolean default false,
  created_at timestamp with time zone default now()
);
alter table duas enable row level security;
drop policy if exists "Users manage own duas" on duas;
create policy "Users manage own duas" on duas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── ai_insights ───────────────────────────────────────────
create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  date date not null,
  message text,
  trigger_type text,
  dismissed boolean default false,
  created_at timestamp with time zone default now()
);
alter table ai_insights enable row level security;
drop policy if exists "Users manage own insights" on ai_insights;
create policy "Users manage own insights" on ai_insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── push_subscriptions ────────────────────────────────────
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  expo_token text,
  created_at timestamp with time zone default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "Users manage own push subs" on push_subscriptions;
create policy "Users manage own push subs" on push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── notification_settings ─────────────────────────────────
create table if not exists notification_settings (
  user_id uuid primary key references auth.users on delete cascade,
  fajr boolean default true,
  dhuhr boolean default true,
  asr boolean default true,
  maghrib boolean default true,
  isha boolean default true,
  mosque_nearby boolean default true
);
alter table notification_settings enable row level security;
drop policy if exists "Users manage own notif settings" on notification_settings;
create policy "Users manage own notif settings" on notification_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
